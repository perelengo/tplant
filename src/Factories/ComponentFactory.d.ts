import ts from 'typescript';
import { Method } from '../Components/Method';
import { Property } from '../Components/Property';
import { TypeParameter } from '../Components/TypeParameter';
import { IComponentComposite } from '../Models/IComponentComposite';
import { Modifier } from '../Models/Modifier';
export declare function isNodeExported(node: ts.Node): boolean;
export declare function create(fileName: string, node: ts.Node, checker: ts.TypeChecker): IComponentComposite[];
export declare function getHeritageClauseNames(heritageClause: ts.HeritageClause, checker: ts.TypeChecker): string[][];
export declare function getOriginalFileOriginalType(tsType: ts.Type, checker: ts.TypeChecker): string;
export declare function getMemberModifier(memberDeclaration: ts.Declaration): Modifier;
export declare function isModifier(memberDeclaration: ts.Declaration, modifierKind: ts.SyntaxKind): boolean;
export declare function serializeConstructors(memberSymbols: ts.UnderscoreEscapedMap<ts.Symbol>, checker: ts.TypeChecker): (Property | Method)[];
export declare function serializeMethods(memberSymbols: ts.UnderscoreEscapedMap<ts.Symbol>, checker: ts.TypeChecker): (Property | Method)[];
export declare function serializeTypeParameters(memberSymbols: ts.UnderscoreEscapedMap<ts.Symbol>, checker: ts.TypeChecker): TypeParameter[];
export declare function hasInitializer(declaration: ts.ParameterDeclaration): boolean;
export declare function isOptional(declaration: ts.PropertyDeclaration | ts.ParameterDeclaration | ts.MethodDeclaration): boolean;
export declare function getNamespace(symbol: ts.Symbol): string;