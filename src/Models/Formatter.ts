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
import { ComponentComposite, IComponentComposite } from './IComponentComposite';
import { AngularJSComponent } from '../Components/AngularJSComponent';
import { AngularJSComponentInstance } from '../Components/AngularJSComponentInstance';


//const REGEX_ONLY_TYPE_NAMES: RegExp = /\w+/g;
//const REGEX_TYPE_NAMES_WITH_ARRAY: RegExp = /\w+(?:\[\])?/g;

/**
 * Define a format for class diagram
 */
export abstract class Formatter {

    protected entitiesRegistry: Map<string, ComponentComposite>=new Map<string, ComponentComposite>();
    protected serializedEntitiesRegistry: Map<string, ComponentComposite>=new Map<string, ComponentComposite>();
    protected associationsRegistry: Map<string, boolean>=new Map<string, boolean>();
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
    public abstract serializeAngularJSComponent(component: AngularJSComponent) : string;
    
    public serialize(component: IComponentComposite, _ignoreOnlyAssociationsOption:boolean=false) : string {
        if (component.componentKind === ComponentKind.CLASS) {
            let namespacedName=(!(<Class>component).namespace || ((<Class>component).namespace && (<Class>component).namespace?.length==0))?(<Class>component).name:(<Class>component).namespace+"."+(<Class>component).name;
            let fullName=(!(<Class>component).moduleName || ((<Class>component).moduleName && (<Class>component).moduleName?.length==0))?namespacedName:(<Class>component).moduleName+"."+namespacedName;;
            this.serializedEntitiesRegistry.set(fullName,component);
            
            return this.serializeClass(<Class> component);
        } else if (component.componentKind === ComponentKind.FILE) {
            return this.serializeFile(<File> component);
        } else if (component.componentKind === ComponentKind.ENUM) {
            let namespacedName=(!(<Enum>component).namespace || ((<Enum>component).namespace && (<Enum>component).namespace?.length==0))?(<Enum>component).name:(<Enum>component).namespace+"."+(<Enum>component).name;
            let fullName=(!(<Enum>component).moduleName || ((<Enum>component).moduleName && (<Enum>component).moduleName?.length==0))?namespacedName:(<Enum>component).moduleName+"."+namespacedName;;
            this.serializedEntitiesRegistry.set(fullName,component);
            
            return this.serializeEnum(<Enum> component);
        } else if (component.componentKind === ComponentKind.ENUM_VALUE) {
			if(this.options.onlyAssociations && !_ignoreOnlyAssociationsOption)
				return "";
			
            return this.serializeEnumValue(<EnumValue> component);
        } else if (component.componentKind === ComponentKind.INTERFACE) {
            let namespacedName=(!(<Interface>component).namespace || ((<Interface>component).namespace && (<Interface>component).namespace?.length==0))?(<Interface>component).name:(<Interface>component).namespace+"."+(<Interface>component).name;
            let fullName=(!(<Interface>component).moduleName || ((<Interface>component).moduleName && (<Interface>component).moduleName?.length==0))?namespacedName:(<Interface>component).moduleName+"."+namespacedName;;
            this.serializedEntitiesRegistry.set(fullName,component);
            
            return this.serializeInterface(<Interface> component);
        } else if (component.componentKind === ComponentKind.METHOD) {
			if(this.options.onlyAssociations && !_ignoreOnlyAssociationsOption)
				return "";
			
			return this.serializeMethod(<Method> component);
        } else if (component.componentKind === ComponentKind.NAMESPACE) {            
            return this.serializeNamespace(<Namespace> component);
        } else if (component.componentKind === ComponentKind.PARAMETER) {
			if(this.options.onlyAssociations && !_ignoreOnlyAssociationsOption)
				return "";
			
            return this.serializeParameter(<Parameter> component);
        } else if (component.componentKind === ComponentKind.PROPERTY) {
            if(!this.options.onlyAssociations && !_ignoreOnlyAssociationsOption)
                return this.serializeProperty(<Property> component);
            else if(this.getAssociations(<Property> component).length>0 && this.options.onlyAssociations)
                return this.serializeProperty(<Property> component);
            else
                return "";
        } else if (component.componentKind === ComponentKind.TYPE_PROPERTY) {
            return this.serializeTypeParameter(<TypeParameter> component);
        } else if (component.componentKind === ComponentKind.INSTANCE_ANGULARJSCOMPONENT) {
            if(this.options.onlyAssociations && !_ignoreOnlyAssociationsOption)
				return "";
            if(this.options.angularJSComponentsPathRegexp){
                let exp:RegExp=new RegExp(this.options.angularJSComponentsPathRegexp,"i");
                if((<AngularJSComponentInstance>component).componentPath.match(exp)!=null){
                    this.serializedEntitiesRegistry.set((<AngularJSComponentInstance>component).componentPath,component);
                    return this.serializeAngularJSComponent(<AngularJSComponentInstance> component);
                }else{
                    return "";
                }
            }else{
                this.serializedEntitiesRegistry.set((<AngularJSComponentInstance>component).componentPath,component);
                return this.serializeAngularJSComponent(<AngularJSComponentInstance> component);
            }
        }
        throw new Error('Unknown Component');
    }
    public initializeRegistry(components: IComponentComposite[]) :void {
        components.forEach((component: IComponentComposite): void => {
            if (component.componentKind === ComponentKind.CLASS
                || component.componentKind === ComponentKind.ENUM
                || component.componentKind === ComponentKind.INTERFACE) {

                let namespacedName=(!(<Interface>component).namespace || ((<Interface>component).namespace && (<Interface>component).namespace?.length==0))?(<Interface>component).name:(<Interface>component).namespace+"."+(<Interface>component).name;
                let fullName=(!(<Interface>component).moduleName || ((<Interface>component).moduleName && (<Interface>component).moduleName?.length==0))?namespacedName:(<Interface>component).moduleName+"."+namespacedName;;
                this.entitiesRegistry.set(fullName,component);
            } else if (component.componentKind === ComponentKind.NAMESPACE
                || component.componentKind === ComponentKind.FILE
            ) {            
                this.initializeRegistry((<Namespace> component).parts);
            }
        });
    }

    public renderFiles(files: IComponentComposite[], associations: boolean) : string {

        const lines : string[] = [];
        let associationLines:string[]=[];

        this.getMappedTypes(files);
        associationLines=this.createAssociations(files);
        

        lines.push(...this.header());

        files.forEach((file: IComponentComposite): void => {
            const conversion: string = this.serialize(file);
            if (conversion !== '') {
                lines.push(conversion);
            }
        });


        if(!this.options.angularJSComponents || (this.options.angularJSComponents && this.options.angularJSComponents.length==0)){
            let missingAssociationTypesDefinitions:string[]=this.findMissingAssociationTypesDefinitions(this.serializedEntitiesRegistry, this.associationsRegistry);
            let lastMissingAssociationTypesDefinitions:string[]=[];
            while(missingAssociationTypesDefinitions.findIndex((m:string)=>!lastMissingAssociationTypesDefinitions.includes(m))!=-1){
                lastMissingAssociationTypesDefinitions=JSON.parse(JSON.stringify(missingAssociationTypesDefinitions));
                missingAssociationTypesDefinitions
                    .filter((value:string)=>{ return lastMissingAssociationTypesDefinitions.includes(value) })
                    .forEach((value:string)=>{
                        
                        //if the missing type is an array and the non array type is also in the list, ignore
                        if(value.indexOf("[]")!=-1 && missingAssociationTypesDefinitions.includes(value.substring(0,value.lastIndexOf("["))))
                            return;

                        let registeredEntity:IComponentComposite |undefined=this.entitiesRegistry.get((<any>value).replaceAll(/\[\]/gi,""));
                        if(registeredEntity){
                            const conversion: string = this.serialize(registeredEntity);
                            if (conversion !== '') {
                                lines.push(conversion);
                            }
                            associationLines=associationLines.concat(this.createAssociations([registeredEntity]));
                            missingAssociationTypesDefinitions=this.findMissingAssociationTypesDefinitions(this.serializedEntitiesRegistry, this.associationsRegistry);
                        }else if(value.indexOf(".II")==-1 && value.indexOf(".I")==-1){
                            //Class
                            
                            let name:string=(value.lastIndexOf(".")!=-1)?value.substring(value.lastIndexOf(".")+1):value;
                            let namespace:string=(value.lastIndexOf(".")!=-1)?value.substring(0,value.lastIndexOf(".")):"";

                            const component: Class = new Class((<any>name).replaceAll(/\[\]/gi,""), "");
                            component.namespace=namespace;
                        
                            const conversion: string = this.serializeClass(<Class> component);
                            if (conversion !== '') {
                                lines.push(conversion);
                            }
                        }else if(registeredEntity!==undefined){
                            let name:string=(value.lastIndexOf(".")!=-1)?value.substring(value.lastIndexOf(".")+1):value;
                            let namespace:string=(value.lastIndexOf(".")!=-1)?value.substring(0,value.lastIndexOf(".")-1):value;

                            const component: Interface = new Interface((<any>name).replaceAll(/\[\]/gi,""));
                            component.namespace=namespace;
                        
                            const conversion: string = this.serializeInterface(<Interface> component);
                            if (conversion !== '') {
                                lines.push(conversion);
                            }
                        }
                });
            }
        }else{
            this.associationsRegistry.forEach((_value:any, key:string)=>{
                let component:ComponentComposite | undefined = this.entitiesRegistry.get(key);
                if(component){
                    const conversion: string = this.serialize(component, true);
                    if (conversion !== '') {
                        lines.push(conversion);
                    }
                }
            });
        }

        if (associations) {
            lines.push(...associationLines);
        }
        lines.push(...this.footer());

        return lines.join(os.EOL);
    }

    findMissingAssociationTypesDefinitions(entitiesRegistry: Map<string, ComponentComposite>, associationsRegistry: Map<string, boolean>): string[] {
        let missing:string[]=[];
        associationsRegistry.forEach((_value:any, key:string)=>{
            if(!entitiesRegistry.has((<any>key).replaceAll(/\[\]/gi,"")))
                missing.push(key);
        });
    return missing;
        
    }
    public getMappedTypes(files: IComponentComposite[]){
        files.forEach((file: IComponentComposite): void => {
            if(file instanceof File){
                (<File >file).parts.forEach((part: IComponentComposite): void => {
                    const associativeParts: IComponentComposite[]=this.getAssociativeParts(part);
                    associativeParts.forEach((part: IComponentComposite): void => {
                        if (part.componentKind === ComponentKind.CLASS ||
                            part.componentKind === ComponentKind.INTERFACE ||
                            part.componentKind === ComponentKind.ENUM  
                        ) {
                            this.mappedTypes[part.name] = true;
                        }else if(part.componentKind === ComponentKind.INSTANCE_ANGULARJSCOMPONENT){
                            this.mappedTypes[(<AngularJSComponentInstance>part).component.name] = true;
                        }
                    });
                });
            }else if(file instanceof AngularJSComponentInstance){
                let part:AngularJSComponentInstance=(< AngularJSComponentInstance>file);
                const associativeParts: IComponentComposite[]=this.getAssociativeParts(part);
                associativeParts.forEach((part: IComponentComposite): void => {
                    if (part.componentKind === ComponentKind.CLASS ||
                        part.componentKind === ComponentKind.INTERFACE ||
                        part.componentKind === ComponentKind.ENUM 
                    ) {
                        this.mappedTypes[part.name] = true;
                    }else if(part.componentKind === ComponentKind.INSTANCE_ANGULARJSCOMPONENT){
                        this.mappedTypes[(<AngularJSComponentInstance>part).component.name] = true;
                    }
                });
            }else{ //This is the case when printing a targetClass
                let part:IComponentComposite=file;
                if (part.componentKind === ComponentKind.CLASS ||
                    part.componentKind === ComponentKind.INTERFACE 
                ) {
                    let typedPart=(<Class |Interface>part);
                    let partFullModuleAndNamespace:string=(typedPart.moduleName)?typedPart.moduleName:"";
                    partFullModuleAndNamespace+=(partFullModuleAndNamespace!="" && typedPart.namespace)?"."+typedPart.namespace:"";
                    partFullModuleAndNamespace+=(partFullModuleAndNamespace!="" && typedPart.name)?"."+typedPart.name:typedPart.name;
                    this.mappedTypes[partFullModuleAndNamespace] = true;
                    if(this.options.targetClass && (part.componentKind === ComponentKind.CLASS || part.componentKind === ComponentKind.INTERFACE)){
                        
                            (<Class|Interface>part).members
                            .filter((m:IComponentComposite)=>{ 
                                return m.componentKind == ComponentKind.PROPERTY || m.componentKind == ComponentKind.METHOD
                            })
                            .map((prop:ComponentComposite)=>{
                                let p:Property|Method=<Property|Method>prop;
                                let out:string[]=[];
                                    for(let i:number=0;i<p.returnTypeFullName.length;i++){
                                        if(!p.returnTypeFullName[i])
                                            continue;
                                        if(p.returnTypeFullName[i].indexOf("|")!=-1 || ( i<p.returnType.length && p.returnType[i].indexOf("|")!=-1)) //This is too cmplex at the moment, so we skip this case
                                            continue;
                                        if(isComplexType(p.returnTypeFullName[i])){
                                            if(p.returnTypeModuleName[i]!="")
                                                out.push( p.returnTypeModuleName[i]+"."+((p.returnTypeFullName[i]!="")?p.returnTypeFullName[i]:p.returnType[i]) );
                                            else
                                                out.push( (p.returnTypeFullName[i]!="")?p.returnTypeFullName[i]:p.returnType[i] );
                                        }
                                    }
                                    return out;
                            })
                            .flat()
                            .forEach((st:string)=>{
                                let nonArrayMt:string=(<any>st).replaceAll(/\[\]/g,"")
                                
                                let registeredMT:IComponentComposite |undefined = this.entitiesRegistry.get(nonArrayMt);
                                if(registeredMT && this.mappedTypes[nonArrayMt]==undefined){
                                    this.mappedTypes[nonArrayMt]=true;
                                    this.getMappedTypes([registeredMT]);
                                }else{
                                    this.mappedTypes[nonArrayMt]=true;
                                }
                                
                            });
                            
                        
                    }
                }
            }
            
        });
    }

    public getAssociativeParts(part: IComponentComposite): IComponentComposite[]{
        let out: IComponentComposite[]=[];
        if (part.componentKind === ComponentKind.CLASS ||
            part.componentKind === ComponentKind.INTERFACE ||
            part.componentKind === ComponentKind.ENUM ||
            part.componentKind===ComponentKind.INSTANCE_ANGULARJSCOMPONENT
        ) {
            out.push(part);
            /*(<Class>part).members.forEach((m:IComponentComposite)=>{
                out=out.concat(this.getAssociativeParts(m));
            });*/
        }
        if (part.componentKind === ComponentKind.NAMESPACE || part.componentKind===ComponentKind.INSTANCE_ANGULARJSCOMPONENT) {
            (<Namespace | AngularJSComponentInstance> part ).parts.forEach((element1: any) => {
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
            //if (file.componentKind !== ComponentKind.FILE && file.componentKind!==ComponentKind.INSTANCE_ANGULARJSCOMPONENT) {
            //    return;
            //}

            let elements:IComponentComposite[] |AngularJSComponentInstance[];
            if(file instanceof File) elements=file.parts || [];
            else elements = [file];
            
            elements
            /** .filter((part1:IComponentComposite)=>{
                if(this.options.angularJSComponentsPathRegexp){
                    let exp:RegExp=new RegExp(this.options.angularJSComponentsPathRegexp,"i");
                    if(!(part1 instanceof AngularJSComponentInstance)){ return true;
                    }else if((<AngularJSComponentInstance>part1).componentPath.match(exp)!=null){
                       return true;
                    }else{
                        return false;
                    }

                }else{
                    return true;
                }
            })
                */
                .forEach((part1: IComponentComposite): void => {
                const associativeParts: IComponentComposite[]=this.getAssociativeParts(part1);
                associativeParts.forEach((part: IComponentComposite): void => {

                    if (this.options.angularJSComponents && this.options.angularJSComponents.length>0 && ((part instanceof Class) || (part instanceof Interface) && !(part instanceof AngularJSComponentInstance))) {
                        return;
                    }

                    let elements:IComponentComposite[]=(<Class | Interface>part).members || (<AngularJSComponentInstance>part).parts || [];

                    elements.forEach((member: IComponentComposite): void => {
                        let checks: any[] = [];
                        if(!this.options.onlyAssociations){
                            if (member instanceof Method) {
                                member.parameters.forEach((parameter: IComponentComposite): void => {
                                    for(let i:number=0;i<(<Parameter>parameter).returnTypeFullName.length;i++){

                                        //parameter.parameterType.match(REGEX_ONLY_TYPE_NAMES);
                                    
                                        if((<Parameter>parameter).returnTypeFullName.length!=0) 
                                            return;

                                        if((<Parameter>parameter).returnTypeFullName[0])
                                            checks = checks.concat(
                                                {
                                                    memberName:member.name
                                                    ,fullName:(<Parameter>parameter).returnTypeFullName
                                                    ,simpleName:(<Parameter>parameter).parameterType
                                                    ,moduleName:(<Parameter>parameter).returnTypeModuleName
                                                });
                                        else
                                            checks = checks.concat(
                                                {
                                                    memberName:member.name
                                                    ,fullName:(<Parameter>parameter).parameterType
                                                    ,simpleName:(<Parameter>parameter).parameterType
                                                    ,moduleName:(<Parameter>parameter).returnTypeModuleName
                                                });
                                        
                                    }
                                });
                            }
                        }
                        
                        if( (member instanceof Property)
                            || (member instanceof Method && !this.options.onlyAssociations)){
                            // include the fact the type is an array, to support cardinalities
                            let returnTypes: string[]  = (< Property>member).returnTypeFullName;
                            
                            if (returnTypes !== null) {
                                
                                for(let i:number=0;i<returnTypes.length;i++){
                                    if((<Method | Property>member).returnTypeFullName){
                                        checks = checks.concat(
                                            {
                                                memberName:member.name
                                                ,fullName:(<Method | Property>member).returnTypeFullName[i]
                                                ,simpleName:(<Method | Property>member).returnType[i]??(<Method | Property>member).returnType[0]
                                                ,moduleName:(<Method | Property>member).returnTypeModuleName[i]
                                            });
                                    }else{
                                        checks = checks.concat(
                                            {
                                                memberName:member.name
                                                ,fullName:(<Method | Property>member).returnType[i]
                                                ,simpleName:(<Method | Property>member).returnType[i]??(<Method | Property>member).returnType[0]
                                                ,moduleName:(<Method | Property>member).returnTypeModuleName[i]
                                            });
                                    }
                                }
                            }
                        }

                        if( member instanceof AngularJSComponentInstance ){
                            checks = checks.concat(
                                {
                                    memberName:member.name
                                    ,fullName:(<AngularJSComponentInstance>member).componentPath
                                    ,simpleName:(<AngularJSComponentInstance>member).name
                                    ,moduleName:(<AngularJSComponentInstance>member).moduleName
                                    ,isAngularJSComponent:true
                                    ,member:member
                                });

                                //this.createAssociations(member.parts);
                        }
                        
                        for (const tempTypeName of checks) {
                            let memberName=tempTypeName.memberName;
                            let typeName: string = (tempTypeName.fullName)?tempTypeName.fullName.substring(tempTypeName.fullName.lastIndexOf(".")+1):tempTypeName.simpleName; //typeName is with generics, so we reuse the full type name to extract the non generic
                            let fullTypeName: string = tempTypeName.fullName;
                            let cardinality: string =(!tempTypeName.isAngularJSComponent)? '1':"";

                            if (typeName.endsWith('[]')) {
                                cardinality = '*';
                                typeName = typeName.substring(0, typeName.indexOf('[]'));
                            }
                            
                            let namespacedEnd1Name="";
                            if(tempTypeName.isAngularJSComponent===true){
                                namespacedEnd1Name=((<any>part).namespace)?(<any>part).namespace+"."+(<AngularJSComponentInstance>part).componentPath:(<AngularJSComponentInstance>part).componentPath;
                            }else{
                                namespacedEnd1Name=((<any>part).namespace)?(<any>part).namespace+"."+part.name:part.name;
                            }
                            let fullEnd1Name=(!(<Class|Interface|AngularJSComponentInstance>part).moduleName || ((<Class|Interface|AngularJSComponentInstance>part).moduleName && (<Class|Interface|AngularJSComponentInstance>part).moduleName!.length==0))?namespacedEnd1Name:(<Class|Interface|AngularJSComponentInstance>part).moduleName+"."+namespacedEnd1Name;;
                        
                            let namespacedEnd2Name=(fullTypeName)?fullTypeName:typeName;
                            let fullEnd2Name=(!tempTypeName.moduleName || (tempTypeName.moduleName && tempTypeName.moduleName.length==0))?namespacedEnd2Name:tempTypeName.moduleName+"."+namespacedEnd2Name;;
                        
                            let end1:string=(<any>fullEnd1Name).replaceAll(/\[\]/g,"");
                            let end2:string=(<any>fullEnd2Name).replaceAll(/\[\]/g,"");;
                            let serializeAssociation:boolean=true;

                            if(this.options.angularJSComponentsPathRegexp){
                                let exp:RegExp=new RegExp(this.options.angularJSComponentsPathRegexp,"i");
                                if(end1.match(exp)!=null || end2.match(exp)!=null){
                                    serializeAssociation=true
                                }else{
                                    serializeAssociation=false;
                                }

                            }
                            const key: string = `${end1} ${cardinality} ${end2} ${memberName}`;
                            if (typeName !== part.name 
                                //Maybe this can be removed because is used to ensure uniqueness?¿
                                && !Object.prototype.hasOwnProperty.call(outputConstraints, key) &&  Object.prototype.hasOwnProperty.call(this.mappedTypes, end2)
                            ) {
                                if(serializeAssociation){
                                    associations.push(...this.addAssociation(end1, cardinality, end2,memberName));
                                    this.associationsRegistry.set(end1,true);
                                    this.associationsRegistry.set(end2,true);
                                    //this is only needed for angularJS components
                                    if(tempTypeName.isAngularJSComponent===true){
                                        this.entitiesRegistry.set(end1,(<AngularJSComponentInstance>part));
                                        this.entitiesRegistry.set(end2,tempTypeName.member);
                                    }
                                    outputConstraints[key] = true;
                                }
                            }
                        }

                    });
                });
            });
        });

        return associations;
    }

    public getAssociations(member: Property): Property[] {
        if(isComplexType(<any>member.returnType.join(" | "))
        )
            return [member];
        else
            return [];
    }    
}
function isComplexType(returnType: string) {
    return (<any>returnType).replaceAll(/ /g,"").split("|")
            .findIndex((val:string)=>{
                return val !== "number"
                && val !== "boolean"
                && val !== "undefined"
                && val !== "bigint"
                && val !== "string"
                && val !== "symbol"
                && val !== "Date"
                && val !== "Intl.Date"
                && val !== "void"
                && val !== "number[]"
                && val !== "boolean[]"
                && val !== "undefined[]"
                && val !== "bigint[]"
                && val !== "string[]"
                && val !== "symbol[]"
                && val !== "Date[]"
                && val !== "Intl.Date[]"
                //&& val !== "("
                && val !== "false"
                && val !== "true"
                && val !== "\""
                //&& val.indexOf ("{")==-1
            })!=-1
}

