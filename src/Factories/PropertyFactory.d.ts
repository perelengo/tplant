import ts from 'typescript';
import { Property } from '../Components/Property';
export declare function create(signature: ts.Symbol, namedDeclaration: ts.NamedDeclaration, checker: ts.TypeChecker): Property;
