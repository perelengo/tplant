import ts from 'typescript';
import { IComponentComposite } from './Models/IComponentComposite';
import { ICommandOptions } from './Models/ICommandOptions';
export declare function generateDocumentation(fileNames: ReadonlyArray<string> | string, options?: ts.CompilerOptions): IComponentComposite[];
export declare function convertToPlant(files: IComponentComposite[], options?: ICommandOptions): string;
