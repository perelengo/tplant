import ts from 'typescript';
import { TypeParameter } from '../Components/TypeParameter';
export declare function getConstraint(memberDeclaration: ts.Declaration, checker: ts.TypeChecker): ts.Type | undefined;
export declare function create(signature: ts.Symbol, namedDeclaration: ts.NamedDeclaration | undefined, checker: ts.TypeChecker): TypeParameter;
