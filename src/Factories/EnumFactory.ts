import ts from 'typescript';
import { Enum } from '../Components/Enum';
import { IComponentComposite } from '../Models/IComponentComposite';
import * as EnumValueFactory from './EnumValueFactory';
import * as ComponentFactory from './ComponentFactory';

export function create(fileName: string,enumSymbol: ts.Symbol, options:any): Enum {
    const result: Enum = new Enum(enumSymbol.getName());
    result.namespace=ComponentFactory.getNamespace(enumSymbol);

    //search moduleName
    options.modules.forEach((module:any) => {
        if(module.sources.includes(fileName)){
            result.moduleName=module.moduleName;
        }
    });
    
    if (enumSymbol.exports !== undefined && !options.onlyAssociations) {
        result.values = serializeEnumProperties(enumSymbol.exports);
    }

    return result;
}

function serializeEnumProperties(memberSymbols: ts.UnderscoreEscapedMap<ts.Symbol>): IComponentComposite[] {
    const result: IComponentComposite[] = [];

    if (memberSymbols !== undefined) {
        memberSymbols.forEach((memberSymbol: ts.Symbol): void => {
            const memberDeclarations: ts.NamedDeclaration[] | undefined = memberSymbol.getDeclarations();
            if (memberDeclarations === undefined) {
                return;
            }
            memberDeclarations.forEach((memberDeclaration: ts.NamedDeclaration): void => {
                if (memberDeclaration.kind === ts.SyntaxKind.EnumMember) {
                    result.push(EnumValueFactory.create(memberSymbol));
                }
            });
        });
    }

    return result;
}
