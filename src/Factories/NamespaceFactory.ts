import ts from 'typescript';
import { Namespace } from '../Components/Namespace';
import * as ComponentFactory from './ComponentFactory';

export function create(fileName: string, namespaceSymbol: ts.Symbol, checker: ts.TypeChecker, options:any): Namespace {
    const result: Namespace = new Namespace((!namespaceSymbol.getName)?(<any>namespaceSymbol.name).text:namespaceSymbol.getName());

    //search moduleName
    options.modules.forEach((module:any) => {
        if(module.sources.includes(fileName) ){
            result.moduleName=module.moduleName;
        }
    });
    result.isTopNamespace=(<any>namespaceSymbol).parent.kind!=ts.SyntaxKind.ModuleDeclaration;
    
    const declaration: any = namespaceSymbol;

    if (declaration === undefined || (declaration.body === undefined && declaration.valueDeclaration.body === undefined)) {
        return result;
    }

    if (declaration.body.kind === ts.SyntaxKind.ModuleDeclaration) {
        const childSymbol: ts.Symbol | undefined = (declaration.body === undefined)?(declaration.valueDeclaration.body):(<any>declaration.body);
        if (childSymbol !== undefined) {
            result.parts = [create(fileName, childSymbol, checker,options)];

            return result;
        }
    }

    if ((<ts.ModuleBlock>declaration.body).statements === undefined) {
        return result;
    }

    result.parts = ComponentFactory.create(fileName, declaration.body, checker,options);

    return result;
}
