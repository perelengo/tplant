import * as os from 'os';
import { Class } from '../Components/Class';
import { Enum } from '../Components/Enum';
import { EnumValue } from '../Components/EnumValue';
import { Interface } from '../Components/Interface';
import { Method } from '../Components/Method';
import { Namespace } from '../Components/Namespace';
import { Parameter } from '../Components/Parameter';
import { Property } from '../Components/Property';
import { TypeParameter } from '../Components/TypeParameter';
import { Formatter } from '../Models/Formatter';
import {  IComponentComposite } from '../Models/IComponentComposite';
import { AngularJSComponentInstance } from '../Components/AngularJSComponentInstance';

/**
 * Export diagram class using plantuml format
 */
export class PlantUMLFormat extends Formatter {

    protected anonymousEtitiesRegistry: Map<string, string>=new Map<string, string>();
    
    public header(): string[] {
      const result: string[] = ['@startuml'];

      if (this.options.customization !== undefined) {
        result.push(`!include ${this.options.customization}`);
      }

      return result;
    }

    public footer(): string[] {
        return ['@enduml'];
    }

    public addAssociation(type1: string, cardinality: string, type2: string, endName:string) : string[] {
        
        return [
            `"${this.getAnonymized(type1)}" --> "${cardinality} ${endName}" "${(<any>this.getAnonymized(type2)).replaceAll(/\[\]/gi,"")}"`
        ];
    }

    public serializeClass(comp: Class) : string {
        const result: string[] = [];
        const firstLine: string[] = [];
        if (comp.isAbstract) {
            firstLine.push('abstract ');
        }

        let namespacedName=(!comp.namespace || (comp.namespace && comp.namespace.length==0))?comp.name:comp.namespace+"."+comp.name;
        let fullName=(!comp.moduleName || (comp.moduleName && comp.moduleName.length==0))?namespacedName:comp.moduleName+"."+namespacedName;;

        firstLine.push(`class "${comp.name}" as ${this.getAnonymized(fullName)}`);
        if (comp.typeParameters.length > 0) {
            firstLine.push('<');
            firstLine.push(comp.typeParameters
                .map((typeParameter: IComponentComposite): string => this.serializeTypeParameter(<TypeParameter> typeParameter))
                .join(', '));
            firstLine.push('>');
        }
        if (comp.extendsClass !== undefined) {
            firstLine.push(` extends ${comp.extendsClass}`);
        }
        if (!this.options.onlyClasses && comp.implementsInterfaces.length > 0) {
            firstLine.push(` implements ${comp.implementsInterfaces.join(', ')}`);
        }
        this.serializeMembers(comp, firstLine, result);

        return result.join(os.EOL);
    }

    public serializeMembers(comp: Class | Interface, firstLine: string[], result: string[]) : void {
        if (comp.members.length > 0) {
            firstLine.push(' {');
        }
        result.push(firstLine.join(''));
        comp.members.forEach((member: IComponentComposite): void => {
            let line=this.serialize(member);
            if(line!=="")
                result.push(`    ${line}`);
        });
        if (comp.members.length > 0) {
            result.push('}');
        }
    }

    public serializeEnum(comp: Enum): string {
        const result: string[] = [];

        let namespacedName=(!comp.namespace || (comp.namespace && comp.namespace.length==0))?comp.name:comp.namespace+"."+comp.name;
        let fullName=(!comp.moduleName || (comp.moduleName && comp.moduleName.length==0))?namespacedName:comp.moduleName+"."+namespacedName;;

        let declaration: string = `enum "${comp.name}" as ${fullName}`;
        if (comp.values.length > 0) {
            declaration += ' {';
        }
        result.push(declaration);
        comp.values.forEach((enumValue: IComponentComposite): void => {
            result.push(`    ${this.serializeEnumValue(<EnumValue>enumValue)}`);
        });
        if (comp.values.length > 0) {
            result.push('}');
        }

        return result.join(os.EOL);
    }

    public serializeInterface(comp: Interface): string {
        const result: string[] = [];
        const firstLine: string[] = [];
        
        let namespacedName=(!comp.namespace || (comp.namespace && comp.namespace.length==0))?comp.name:comp.namespace+"."+comp.name;
        let fullName=(!comp.moduleName || (comp.moduleName && comp.moduleName.length==0))?namespacedName:comp.moduleName+"."+namespacedName;;

        firstLine.push(`interface "${comp.name}" as ${fullName}`);
        if (comp.typeParameters.length > 0) {
            firstLine.push('<');
            firstLine.push(comp.typeParameters
                .map((typeParameter: IComponentComposite): string => this.serializeTypeParameter(<TypeParameter> typeParameter))
                .join(', '));
            firstLine.push('>');
        }
        if (comp.extendsInterface.length > 0) {
            firstLine.push(` extends ${comp.extendsInterface.join(', ')}`);
        }
        this.serializeMembers(comp, firstLine, result);

        return result.join(os.EOL);
    }

    public serializeMethod(comp: Method) : string {
        let result: string = { public: '+', private: '-', protected: '#' }[comp.modifier];
        result += (comp.isAbstract ? '{abstract} ' : '');
        result += (comp.isStatic ? '{static} ' : '');
        result += `${comp.name}(`;
        result += comp.parameters
            .map((parameter: IComponentComposite): string => this.serialize(parameter))
            .join(', ');
        result += `): ${comp.returnType}`;

        return result;
    }

    public serializeNamespace(comp: Namespace) : string {
        const result: string[] = [];

        let margin:string=(comp.isTopNamespace && comp.moduleName)?'    ':'';
        if(comp.isTopNamespace && comp.moduleName)
            result.push(`namespace ${comp.moduleName} {`);
        result.push(`${margin}namespace ${comp.name} {`);
        comp.parts.forEach((part: IComponentComposite): void => {
            let margin2:string=(comp.isTopNamespace && comp.moduleName)?'        ':'    ';
            result.push(
                this.serialize(part)
                    .replace(/^(?!\s*$)/gm, margin2)
            );
            
        });
        result.push(`${margin}}`);
        if(comp.isTopNamespace && comp.moduleName)
            result.push('}');

        return result.join(os.EOL);
    }

    public serializeParameter(comp: Parameter) : string {
        return `${comp.name}${comp.isOptional || comp.hasInitializer ? '?' : ''}: ${comp.parameterType}`;
    }

    public serializeProperty(comp: Property) : string {
        let result: string = { public: '+', private: '-', protected: '#' }[comp.modifier];
        result += (comp.isAbstract ? '{abstract} ' : '');
        result += (comp.isStatic ? '{static} ' : '');
        result += `${comp.name}${(comp.isOptional ? '?' : '')}: ${comp.returnType.join(" | ")}`;

        return result;
    }

    public serializeTypeParameter(comp: TypeParameter) : string {
        return `${comp.name}${(comp.constraint !== undefined ? ` extends ${comp.constraint}` : '')}`;
    }
    
    public serializeAngularJSComponent(comp: AngularJSComponentInstance): string {
        const result: string[] = [];
        
        result.push(`class "${comp.name}" as ${comp.componentPath}`);
        comp.parts.forEach((part:IComponentComposite)=>{
            result.push(this.serializeAngularJSComponent(<AngularJSComponentInstance>part));
        });
        return result.join(os.EOL);
    }

    public getAnonymized(name: string) :string{
        if(name.indexOf("{")!=-1 || name.indexOf("(")!=-1){
            let existing:string|undefined=this.anonymousEtitiesRegistry.get(name);
            if(existing){
                return existing;
            }else{
                let anonimizedName="Anonymous@"+this.anonymousEtitiesRegistry.size;
                this.anonymousEtitiesRegistry.set(name,anonimizedName);
                return anonimizedName;
            }
        }else{
            return name;
        }
    }
}
