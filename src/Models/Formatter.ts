import * as os from 'os';
import { Class } from '../Components/Class';
import { Enum } from '../Components/Enum';
import { EnumValue } from '../Components/EnumValue';
import { File } from '../Components/File';
import { Interface } from '../Components/Interface';
import { Method } from '../Components/Method';
import { Namespace } from '../Components/Namespace';
import { Parameter } from '../Components/Parameter';
import { Property } from '../Components/Property';
import { TypeParameter } from '../Components/TypeParameter';
import { ComponentKind } from './ComponentKind';
import { ICommandOptions } from './ICommandOptions';
import { IComponentComposite } from './IComponentComposite';

const REGEX_ONLY_TYPE_NAMES: RegExp = /\w+/g;
const REGEX_TYPE_NAMES_WITH_ARRAY: RegExp = /\w+(?:\[\])?/g;

/**
 * Define a format for class diagram
 */
export abstract class Formatter {

    protected mappedTypes: { [x: string]: boolean } = {};
    /**
     * Options sent to the cli
     */
    protected options: ICommandOptions;

    constructor(options: ICommandOptions) {
        this.options = options;
    }

    public header() : string[] {
        return [];
    }

    public footer() : string[] {
        return [];
    }

    public abstract addAssociation(type1: string, cardinality: string, type2: string, endName:string) : string[];

    public serializeFile(file: File) : string {
        const result: string[] = [];
        file.parts.forEach((part: IComponentComposite): void => {
            result.push(this.serialize(part));
        });

        return result.join(os.EOL);
    }

    public abstract serializeClass(component: Class) : string;
    public abstract serializeEnum(component: Enum) : string;

    public serializeEnumValue(component: EnumValue) : string {
        return component.name;
    }

    public abstract serializeInterface(component: Interface) : string;
    public abstract serializeMethod(component: Method) : string;
    public abstract serializeNamespace(component: Namespace) : string;
    public abstract serializeParameter(component: Parameter) : string;
    public abstract serializeProperty(component: Property) : string;
    public abstract serializeTypeParameter(component: TypeParameter) : string;

    public serialize(component: IComponentComposite) : string {
        if (component.componentKind === ComponentKind.CLASS) {
            return this.serializeClass(<Class> component);
        } else if (component.componentKind === ComponentKind.FILE) {
            return this.serializeFile(<File> component);
        } else if (component.componentKind === ComponentKind.ENUM) {
            return this.serializeEnum(<Enum> component);
        } else if (component.componentKind === ComponentKind.ENUM_VALUE) {
			if(this.options.onlyAssociations)
				return "";
			
            return this.serializeEnumValue(<EnumValue> component);
        } else if (component.componentKind === ComponentKind.INTERFACE) {
            return this.serializeInterface(<Interface> component);
        } else if (component.componentKind === ComponentKind.METHOD) {
			if(this.options.onlyAssociations)
				return "";
			
			return this.serializeMethod(<Method> component);
        } else if (component.componentKind === ComponentKind.NAMESPACE) {
            return this.serializeNamespace(<Namespace> component);
        } else if (component.componentKind === ComponentKind.PARAMETER) {
			if(this.options.onlyAssociations)
				return "";
			
            return this.serializeParameter(<Parameter> component);
        } else if (component.componentKind === ComponentKind.PROPERTY) {
            if(!this.options.onlyAssociations)
                return this.serializeProperty(<Property> component);
            else if(this.getAssociations(<Property> component).length>0 && this.options.onlyAssociations)
                return this.serializeProperty(<Property> component);
            else
                return "";
        } else if (component.componentKind === ComponentKind.TYPE_PROPERTY) {
            return this.serializeTypeParameter(<TypeParameter> component);
        }
        throw new Error('Unknown Component');
    }

    public renderFiles(files: IComponentComposite[], associations: boolean) : string {
        const lines : string[] = [];
        this.getMappedTypes(files);
        lines.push(...this.header());

        files.forEach((file: IComponentComposite): void => {
            const conversion: string = this.serialize(file);
            if (conversion !== '') {
                lines.push(conversion);
            }
        });

        if (associations) {
            lines.push(...this.createAssociations(files));
        }
        lines.push(...this.footer());

        return lines.join(os.EOL);
    }
    public getMappedTypes(files: IComponentComposite[]){
        files.forEach((file: IComponentComposite): void => {
            (<File>file).parts.forEach((part: IComponentComposite): void => {
                const associativeParts: IComponentComposite[]=this.getAssociativeParts(part);
                associativeParts.forEach((part: IComponentComposite): void => {
                    if (part.componentKind === ComponentKind.CLASS ||
                        part.componentKind === ComponentKind.INTERFACE ||
                        part.componentKind === ComponentKind.ENUM
                    ) {
                        this.mappedTypes[part.name] = true;
                    }
                });
            });
        });
    }

    public getAssociativeParts(part: IComponentComposite): IComponentComposite[]{
        const out: IComponentComposite[]=[];
        if (part.componentKind === ComponentKind.CLASS ||
            part.componentKind === ComponentKind.INTERFACE ||
            part.componentKind === ComponentKind.ENUM
        ) {
            out.push(part);
        }else if (part.componentKind === ComponentKind.NAMESPACE) {
            (<Namespace> part ).parts.forEach((element1: any) => {
                const temp: IComponentComposite[]=this.getAssociativeParts(element1);
                temp.forEach((element2: any) => {
                    out.push(element2);
                });
            }); 
        }
        return out;
    }
    public createAssociations(files: IComponentComposite[]): string[] {
        const associations: string[] = [];
       
        const outputConstraints: { [x: string]: boolean } = {};
        
        files.forEach((file: IComponentComposite): void => {
            if (file.componentKind !== ComponentKind.FILE) {
                return;
            }

            (<File>file).parts.forEach((part1: IComponentComposite): void => {
                const associativeParts: IComponentComposite[]=this.getAssociativeParts(part1);
                associativeParts.forEach((part: IComponentComposite): void => {

                    if (!(part instanceof Class) && !(part instanceof Interface)) {
                        return;
                    }

                    part.members.forEach((member: IComponentComposite): void => {
                        let checks: any[] = [];
                        if(!this.options.onlyAssociations){
                            if (member instanceof Method) {
                                member.parameters.forEach((parameter: IComponentComposite): void => {
                                    const parameters: string[] | null = (<Parameter>parameter).parameterType.match(REGEX_ONLY_TYPE_NAMES);
                                    if (parameters !== null) {
                                    
                                            if((<Parameter>parameter).returnTypeFullName)
                                                checks = checks.concat(
                                                    {
                                                        memberName:member.name
                                                        ,fullName:(<Parameter>parameter).returnTypeFullName
                                                        ,simpleName:(<Parameter>parameter).parameterType
                                                    });
                                            else
                                                checks = checks.concat(
                                                    {
                                                        memberName:member.name
                                                        ,fullName:(<Parameter>parameter).parameterType
                                                        ,simpleName:(<Parameter>parameter).parameterType
                                                    });
                                        
                                    }
                                });
                            }
                        }
                        // include the fact the type is an array, to support cardinalities
                        const returnTypes: string[] | null = (<Method | Property>member).returnType.match(REGEX_TYPE_NAMES_WITH_ARRAY);
                        
                        if( (member instanceof Property)
                            || (member instanceof Method && !this.options.onlyAssociations)){

                            if (returnTypes !== null) {
                                if((<Method | Property>member).returnTypeFullName)
                                    checks = checks.concat(
                                        {
                                            memberName:member.name
                                            ,fullName:(<Method | Property>member).returnTypeFullName
                                            ,simpleName:(<Method | Property>member).returnType
                                        });
                                else
                                    checks = checks.concat(
                                        {
                                            memberName:member.name
                                            ,fullName:(<Method | Property>member).returnType
                                            ,simpleName:(<Method | Property>member).returnType
                                        });
                            }
                        }
                        
                        for (const tempTypeName of checks) {
                            let memberName=tempTypeName.memberName;
                            let typeName: string = tempTypeName.simpleName;
                            let fullTypeName: string = tempTypeName.fullName;
                            let cardinality: string = '1';

                            if (typeName.endsWith('[]')) {
                                cardinality = '*';
                                typeName = typeName.substring(0, typeName.indexOf('[]'));
                            }
                            const key: string = `${part.name} ${cardinality} ${typeName}`;
                            if (typeName !== part.name &&
                                !Object.prototype.hasOwnProperty.call(outputConstraints, key) && Object.prototype.hasOwnProperty.call(this.mappedTypes, typeName)) {
                                let fullPartName=((<any>part).namespace)?(<any>part).namespace+"."+part.name:undefined;

                                associations.push(...this.addAssociation((fullPartName)?fullPartName:part.name, cardinality, (fullTypeName)?fullTypeName:typeName,memberName));
                                outputConstraints[key] = true;
                            }
                        }

                    });
                });
            });
        });

        return associations;
    }

    public getAssociations(member: Property): Property[] {
        const associations: Property[] = [];

        const outputConstraints: { [x: string]: boolean } = {};

                    
        let checks: any[] = [];
        // include the fact the type is an array, to support cardinalities
        const returnTypes: string[] | null = (<Method | Property>member).returnType.match(REGEX_TYPE_NAMES_WITH_ARRAY);
        
        

            if (returnTypes !== null) {
                if((<Method | Property>member).returnTypeFullName)
                    checks = checks.concat(
                        {
                            member:member
                            ,memberName:member.name
                            ,fullName:(<Method | Property>member).returnType
                            ,simpleName:(<Method | Property>member).returnType
            });
                else
                    checks = checks.concat(
                        {
                            member:member
                            ,memberName:member.name
                            ,fullName:(<Method | Property>member).returnType
                            ,simpleName:(<Method | Property>member).returnType
             });
            }
        
        
        for (const tempTypeName of checks) {
            let typeName: string = tempTypeName.simpleName;
            let cardinality: string = '1';

            if (typeName.endsWith('[]')) {
                cardinality = '*';
                typeName = typeName.substring(0, typeName.indexOf('[]'));
            }
            const key: string = `${member.name} ${cardinality} ${typeName}`;
            if (typeName !== member.name &&
                !Object.prototype.hasOwnProperty.call(outputConstraints, key) && Object.prototype.hasOwnProperty.call(this.mappedTypes, typeName)) {

                associations.push(tempTypeName.member);
                outputConstraints[key] = true;
            }
        }

                   

        return associations;
    }    
}
