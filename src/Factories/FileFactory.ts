import ts from 'typescript';
import { File } from '../Components/File';
import * as ComponentFactory from './ComponentFactory';

export function create(fileName: string, sourceFile: ts.SourceFile, checker: ts.TypeChecker, options:any): File {
    const file: File = new File(sourceFile.fileName);
    file.parts = ComponentFactory.create(fileName, sourceFile, checker,options);

    return file;
}
