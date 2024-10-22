import ts from 'typescript';
import { Method } from '../Components/Method';
export declare function create(signature: ts.Symbol, namedDeclaration: ts.NamedDeclaration, checker: ts.TypeChecker): Method;
