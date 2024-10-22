import ts from 'typescript';
import { File } from '../Components/File';
export declare function create(fileName: string, sourceFile: ts.SourceFile, checker: ts.TypeChecker): File;
