import ts, { SourceFile } from 'typescript';
import { Property } from '../Components/Property';
import * as ComponentFactory from './ComponentFactory';



export function create(signature: ts.Symbol, namedDeclaration: ts.NamedDeclaration, checker: ts.TypeChecker, options:any): Property {
    const result: Property = new Property(signature.getName());
    result.modifier = ComponentFactory.getMemberModifier(namedDeclaration);
    result.isAbstract = ComponentFactory.isModifier(namedDeclaration, ts.SyntaxKind.AbstractKeyword);
    result.isOptional = ComponentFactory.isOptional(<ts.PropertyDeclaration>namedDeclaration);
    result.isStatic = ComponentFactory.isModifier(namedDeclaration, ts.SyntaxKind.StaticKeyword);
    result.isReadonly = ComponentFactory.isModifier(namedDeclaration, ts.SyntaxKind.ReadonlyKeyword);

    if (signature.valueDeclaration === undefined) {
        throw new Error("unable to determing returnType");
    }
    ComponentFactory.getNamespace(signature);
    let source:SourceFile | undefined=ComponentFactory.getSourceCode(signature, checker);
    let importedNamespaces: string []=ComponentFactory.getImports(source);
    
    let type:ts.Type=checker.getTypeOfSymbolAtLocation(
        signature,
        (<any>signature.valueDeclaration).type
    );
    
    for(let i:number=0;i<(((<any>type).types)?(<any>type).types.length:1);i++){
        let deParameterType: ts.Type | undefined = ((<any>type).types)?(<any>type).types[i]:type;
        let typeSymbol: ts.Symbol | undefined = ((<any>type).types)?(<any>type).types[i].getSymbol():type.getSymbol();
        let acumTypeSymbol: ts.Symbol | undefined =typeSymbol;
        while (acumTypeSymbol?.name === 'Array') {
            deParameterType = checker.getTypeArguments(<ts.TypeReference>deParameterType)[0];
            acumTypeSymbol=deParameterType.getSymbol();
        }

        result.returnType[i]=checker.typeToString(
            deParameterType!,
             namedDeclaration
         );
        let generic:ts.Type | undefined=checker.getTypeFromTypeNode((<any>signature.valueDeclaration)?.type);
        let specific:ts.Type[] | undefined=((<any>signature.valueDeclaration)?.type?.typeArguments || (<any>signature.valueDeclaration)?.element?.typeArguments)?.map((element:any) =>{return checker.getTypeFromTypeNode(element); });
         if(result.returnType[i]=="any" && generic && specific){
            let genericName=(<any>signature.valueDeclaration)?.type?.typeName.text;
            result.returnType[i]=genericName+"<"+specific.map((e:ts.Type)=>{
                return checker.typeToString(e)
            }).join(",")+">";
         }
        checker.getTypeFromTypeNode
        if(!((deParameterType!.flags==ts.TypeFlags.Any && result.returnType[i].indexOf("<")==-1) || deParameterType!.flags==ts.TypeFlags.String || deParameterType!.flags==ts.TypeFlags.Number || deParameterType!.flags==ts.TypeFlags.Boolean  ||  deParameterType!.flags==ts.TypeFlags.Undefined)){
            let allTypes = ((result.returnType[i].indexOf("<")!=-1)?(<any>result.returnType[i]).replaceAll(">", ""):result.returnType[i]).split("<").map((e:any) => { return e.split(","); }).flat();
            let currentDiamond:number=0;
            let currentSpecificInDiamond:number=0;
            let currentSpecific:ts.Type[] | undefined;
            let remainingTypes:string=result.returnType[i].substring(result.returnType[i].indexOf("<")+1);
            for(let j:number=0;j<allTypes.length;j++){
                currentSpecific=(specific && currentDiamond!=0 && (<any>currentSpecific![currentSpecificInDiamond]).typeArguments)?(<any>currentSpecific![currentSpecificInDiamond]).typeArguments:specific;
                deParameterType=(currentDiamond==0 && specific )?generic:((currentDiamond!=0 && specific)?specific![currentSpecificInDiamond]:deParameterType);
                
                if(allTypes.length>1 && remainingTypes.indexOf(",")!=-1 && remainingTypes.indexOf(",")<remainingTypes.indexOf("<")){
                    currentSpecificInDiamond++;
                    remainingTypes=remainingTypes.substring(remainingTypes.indexOf(",")+1);        
                }else if(allTypes.length>1){
                    currentDiamond++;
                    remainingTypes=remainingTypes.substring(remainingTypes.indexOf("<")+1);       
                }    
                                
                result.propertyTypeFile[i*allTypes.length+j] = ComponentFactory.getOriginalFileOriginalType(deParameterType!, checker);
                result.returnTypeModuleName[i*allTypes.length+j]=ComponentFactory.getModuleName(result.propertyTypeFile[i*allTypes.length+j], options);
                //result.returnType[i]=deParameterType.
                let namespacedType=importedNamespaces.filter((value: string)=>{
                    let regex=/\[\]/gi;
                    return (value.endsWith("."+(<any>allTypes[j]).replaceAll(regex,"")));
                });
                if(namespacedType.length==0 && source){
                    let typeSource:ts.SourceFile | undefined=ComponentFactory.getOriginalFileOriginalTypeSource(deParameterType!,checker);
                    let namespace:string=(typeSource)?ComponentFactory.getNamespaceFromSourceCode(typeSource):"";
                    result.returnTypeFullName[i*allTypes.length+j]=(namespace!="")?namespace+"."+allTypes[j]:allTypes[j];
                }else if(namespacedType.length>0){
                    if(allTypes[j].endsWith("[]")){
                        result.returnTypeFullName[i*allTypes.length+j]=namespacedType[0]+"[]";
                    }else{
                        result.returnTypeFullName[i*allTypes.length+j]=namespacedType[0];
                    }   
                }else{
                    result.returnTypeFullName[i]=result.returnType[i];
                }
            }
        }else{
            result.returnTypeFullName[i]=result.returnType[i];
        }  
    }
    return result;
}
