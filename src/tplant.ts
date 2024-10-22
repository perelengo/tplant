import ts from 'typescript';
import { File } from './Components/File';
import { PlantUMLFormat } from './Formatter/PlantUMLFormat';
import { ComponentKind } from './Models/ComponentKind';
import { Formatter } from './Models/Formatter';
import { IComponentComposite } from './Models/IComponentComposite';

import { Class } from './Components/Class';
import * as FileFactory from './Factories/FileFactory';
import { MermaidFormat } from './Formatter/MermaidFormat';
import { ICommandOptions } from './Models/ICommandOptions';
import * as AngularJSComponentFactory from './Factories/AngularJSComponentFactory';
import { Interface } from './Components/Interface';

const DEFAULT_FILE_NAME = 'source.ts';


export function generateDocumentation(
    fileNames: ReadonlyArray<string> | string,
    options: ts.CompilerOptions = ts.getDefaultCompilerOptions(),
    additionalOptions:any
): IComponentComposite[] {

    // Build a program using the set of root file names in fileNames
    let program: ts.Program;

    if (Array.isArray(fileNames)) {
        program = ts.createProgram(fileNames, options);
    } else {
        program = ts.createProgram({
            rootNames: [DEFAULT_FILE_NAME],
            options,
            host: getCompilerHostForSource(fileNames as string)
        });
    }

    // Get the checker, we will use it to find more about classes
    const checker: ts.TypeChecker = program.getTypeChecker();

    const result: IComponentComposite[] = [];

    // Visit every sourceFile in the program
    program.getSourceFiles()
        .forEach((sourceFile: ts.SourceFile): void => {
            if (!sourceFile.isDeclarationFile) {
                const file: IComponentComposite | undefined = FileFactory.create(sourceFile.fileName, sourceFile, checker,additionalOptions);
                if (file !== undefined) {
                    result.push(file);
                }
            }
        });

    return result;
}

function getCompilerHostForSource(source: string): ts.CompilerHost {
    const sourceFile = ts.createSourceFile(DEFAULT_FILE_NAME, source, ts.ScriptTarget.ES2016);
    return {
        getSourceFile: () => sourceFile,
        getDefaultLibFileName: () => "",
        writeFile: () => undefined,
        getCurrentDirectory: () => "",
        getCanonicalFileName: () => DEFAULT_FILE_NAME,
        useCaseSensitiveFileNames: () => false,
        getNewLine: () => "\n",
        fileExists: () => true,
        readFile: () => {
            throw new Error("NOT IMPLEMENTED");
        }
    }
}

export function convertToPlant(files: IComponentComposite[], options: ICommandOptions = {
    associations: false,
    onlyInterfaces: false,
    format: 'plantuml',
    onlyClasses: false,
	onlyAssociations: false,
    angularJSComponents:[]
}): string {

    let formatter : Formatter;
    if (options.format === 'mermaid') {
        formatter = new MermaidFormat(options);
    } else {
        formatter = new PlantUMLFormat(options);
    }

    // Only display interfaces
    if (options.onlyClasses) {
        for (const file of files) {
            (<File>file).parts = (<File>file).parts
                .filter((part: IComponentComposite): boolean => part.componentKind === ComponentKind.CLASS);
        }
    } else if (options.onlyInterfaces) {
        for (const file of files) {
            (<File>file).parts = (<File>file).parts
                .filter((part: IComponentComposite): boolean => part.componentKind === ComponentKind.INTERFACE);
        }
    } else if (options.targetClass !== undefined) {
        // Find the class to display
        const target : Class | Interface = <Class | Interface > findClass(files, options.targetClass);
        const parts : IComponentComposite[] = [];
        if (target !== undefined) {
            parts.push(target);
            // Add all the ancestor for the class recursively
            let parent : string[] | undefined;
            if(target instanceof Class ) parent=((<Class>target).extendsClass)? [(<Class>target).extendsClass!]:undefined;
            if(target instanceof Interface) parent=((<Interface>target).extendsInterface)?(<Interface>target).extendsInterface:undefined;
            // Add the parent
            
            if(parent){
                parent.forEach((p:string)=>{
                    let p2:string[] |undefined=[p];
                    while (p2 !== undefined && p2.length!=0) {
                        for(let i:number=0;i<p2.length;i++){
                            let p3:string=p2[i];
                            p2.shift();
                            const parentClass : IComponentComposite |undefined =  findClass(files, p3);
                            if(parentClass){    
                                parts.push(parentClass);
                                if(parentClass instanceof Class){
                                    parts.push(...getInterfaces(files, parentClass));
                                    p2 = p2.concat( (parentClass.extendsClass)?[parentClass.extendsClass]:[]);    
                                }else if(parentClass instanceof Interface){
                                    parts.push(...getImplements(files, parentClass));
                                    p2 = p2.concat(parentClass.extendsInterface);  
                                }
                            }
                        };
                    }
                });
            }
            if(target instanceof Class){
                // Add all the interface
                parts.push(...getInterfaces(files, target));
            }
            // Add all child class recursively
            parts.push(...findChildClass(files, target));
        }
        formatter.initializeRegistry(files);
        return formatter.renderFiles(parts, options.associations);
    }

    return formatter.renderFiles(files, options.associations);
}

function getInterfaces(files:  IComponentComposite[], comp: Class) : IComponentComposite[] {
    const res: IComponentComposite[] = [];
    comp.implementsInterfaces.forEach((impl: string) => {
        const implComponent : IComponentComposite | undefined = findClass(files, impl);
        if (implComponent !== undefined) {
            res.push(implComponent);
        }
    });

    return res;
}

function getImplements(files:  IComponentComposite[], comp: Interface) : IComponentComposite[] {
    const res: IComponentComposite[] = [];
    for (const file of files) {
        (<File>file).parts
            .forEach((part: IComponentComposite): void => {
                if (part instanceof Class && (part).implementsInterfaces.find((i:string)=>{return i==comp.name})) {
                    res.push(part);
                    // Reset interface
                    part.implementsInterfaces = [];
                    res.push(...findChildClass(files, part));
                }
            });
    }

    return res;
}

function findClass(files: IComponentComposite[], name: string) : IComponentComposite | undefined {
    for (const file of files) {
        if (file.name === name) {
            return file;
        }else if((<any>file).parts){
            let found: IComponentComposite | undefined=findClass((<any>file).parts,name);
            if(found)
                return found;
        }
    }

    return undefined;
}

function findChildClass(files: IComponentComposite[], comp: IComponentComposite) : IComponentComposite[] {
    const res: IComponentComposite[] = [];
    for (const file of files) {
        (<File>file).parts
            .forEach((part: IComponentComposite): void => {
                if (part instanceof Class && (part).extendsClass === comp.name) {
                    res.push(part);
                    // Reset interface
                    part.implementsInterfaces = [];
                    res.push(...findChildClass(files, part));
                }else if (part instanceof Interface && (part).extendsInterface.find((i:string)=>{return i==comp.name})) {
                    res.push(part);
                    res.push(...findChildClass(files, part));
                }
            });
    }

    return res;
}
export function generateAngularJsDocumentation(
    fileNames: ReadonlyArray<string> ,
    options: ts.CompilerOptions = ts.getDefaultCompilerOptions(),
    additionalOptions:any
): IComponentComposite[] {
    AngularJSComponentFactory.initializeRegistry(fileNames,options,additionalOptions);
    let tree:IComponentComposite[]=AngularJSComponentFactory.initializeTree(fileNames,options,additionalOptions);
    return tree;
}




