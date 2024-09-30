import ts, { SourceFile } from 'typescript';
import { Property } from '../Components/Property';
import * as ComponentFactory from './ComponentFactory';



export function create(signature: ts.Symbol, namedDeclaration: ts.NamedDeclaration, checker: ts.TypeChecker): Property {
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
    let source:SourceFile=ComponentFactory.getSourceCode(signature);
    let importedNamespaces: string []=ComponentFactory.getImports(source);

    result.returnType = checker.typeToString(
        checker.getTypeOfSymbolAtLocation(
            signature,
            signature.valueDeclaration
        ),
        namedDeclaration
    );
    
    let namespacedType=importedNamespaces.filter((value: string)=>{
        let regex=/\[\]/gi;
        return (value.endsWith("."+(<any>result.returnType).replaceAll(regex,"")));
    });
    if(namespacedType.length>0){
        if(result.returnType.endsWith("[]")){
            result.returnTypeFullName=namespacedType[0]+"[]";
        }else{
            result.returnTypeFullName=namespacedType[0];
        }   
    }else{
        result.returnTypeFullName=result.returnType;
    }
    
    return result;
}
