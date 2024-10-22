import ts from 'typescript';
import { Method } from '../Components/Method';
import { Property } from '../Components/Property';
import { TypeParameter } from '../Components/TypeParameter';
import { IComponentComposite } from '../Models/IComponentComposite';
import { Modifier } from '../Models/Modifier';
import * as MethodFactory from './MethodFactory';
import * as PropertyFactory from './PropertyFactory';
import * as TypeParameterFactory from './TypeParameterFactory';
import {File} from '../Components/File';
import { AngularJSComponentInstance } from '../Components/AngularJSComponentInstance';
import {Class} from '../Components/Class';
import { ComponentKind } from '../Models/ComponentKind';
import { Namespace } from '../Components/Namespace';
import * as AngularJSComponentFactory from './AngularJSComponentFactory';
import * as FileFactory from '../Factories/FileFactory';
import { JSDOM } from 'jsdom';
import { AngularJSComponent } from '../Components/AngularJSComponent';

let componentRegistry: Map<string,AngularJSComponent>= new  Map<string,AngularJSComponent>();

export function getComponentRegistry(){
    return componentRegistry;
}; 

export function isNodeExported(node: ts.Node): boolean {
    return (node.flags & ts.ModifierFlags.Export) !== 0 ||
        node.parent.kind === ts.SyntaxKind.SourceFile ||
        node.parent.kind === ts.SyntaxKind.ModuleBlock;
}

export function create(path: string, node :Node,tag:string,Class:Class | undefined, _options:any): AngularJSComponent {

    let instance:AngularJSComponent=new AngularJSComponent( path,node,tag,Class);

    return instance;
}

function getModifier(modifiers: readonly ts.Modifier[]): Modifier {
    for (const modifier of modifiers) {
        if (modifier.kind === ts.SyntaxKind.PrivateKeyword) {
            return 'private';
        }
        if (modifier.kind === ts.SyntaxKind.PublicKeyword) {
            return 'public';
        }
        if (modifier.kind === ts.SyntaxKind.ProtectedKeyword) {
            return 'protected';
        }
    }

    return 'public';
}

export function getHeritageClauseNames(heritageClause: ts.HeritageClause, checker: ts.TypeChecker): string[][] {
    return heritageClause.types.map((nodeObject: ts.ExpressionWithTypeArguments) => {
        const symbolAtLocation: ts.Symbol | undefined = checker.getSymbolAtLocation(nodeObject.expression);
        if (symbolAtLocation !== undefined) {
            const ogFile: string = getOriginalFile(symbolAtLocation, checker);
            let qualifiedName = checker.getFullyQualifiedName(symbolAtLocation);
            qualifiedName = qualifiedName.replace(/"[^"]+"\./, "");
            return [qualifiedName, ogFile];
        }

        return ['', ''];
    });
}

function getOriginalFile(typeSymbol: ts.Symbol, checker: ts.TypeChecker): string {
    let deAliasSymbol: ts.Symbol;

    if ((typeSymbol.flags & ts.SymbolFlags.Alias) !== 0) {
        deAliasSymbol = checker.getAliasedSymbol(typeSymbol);
    } else {
        deAliasSymbol = typeSymbol;
    }

    return deAliasSymbol.declarations?.[0].getSourceFile().fileName ?? '';
}

export function getOriginalFileOriginalType(tsType: ts.Type, checker: ts.TypeChecker): string {
    if (tsType === undefined || checker === undefined) { return ''; }

    let deParameterType: ts.Type = tsType;
    let typeSymbol: ts.Symbol | undefined = tsType.getSymbol();

    while (typeSymbol?.name === 'Array') {
        deParameterType = checker.getTypeArguments(<ts.TypeReference>deParameterType)[0];
        typeSymbol = deParameterType.getSymbol();
    }

    if (typeSymbol === undefined) { return ''; }

    return getOriginalFile(typeSymbol, checker);
}

function isConstructor(declaration: ts.NamedDeclaration): boolean {
  return declaration.kind === ts.SyntaxKind.Constructor;
}

function isMethod(declaration: ts.NamedDeclaration): boolean {
    return declaration.kind === ts.SyntaxKind.MethodDeclaration ||
        declaration.kind === ts.SyntaxKind.MethodSignature;
}

function isProperty(declaration: ts.NamedDeclaration): boolean {
    return declaration.kind === ts.SyntaxKind.PropertySignature ||
        declaration.kind === ts.SyntaxKind.PropertyDeclaration ||
        declaration.kind === ts.SyntaxKind.GetAccessor ||
        declaration.kind === ts.SyntaxKind.SetAccessor ||
        declaration.kind === ts.SyntaxKind.Parameter;
}

function isTypeParameter(declaration: ts.NamedDeclaration): boolean {
    return declaration.kind === ts.SyntaxKind.TypeParameter;
}

export function getMemberModifier(memberDeclaration: ts.Declaration): Modifier {
    if (!ts.canHaveModifiers(memberDeclaration)) {
        return 'public';
    }
    const memberModifiers: readonly ts.Modifier[] | undefined = ts.getModifiers(memberDeclaration);

    if (memberModifiers === undefined) {
        return 'public';
    }

    return getModifier(memberModifiers);
}

export function isModifier(memberDeclaration: ts.Declaration, modifierKind: ts.SyntaxKind): boolean {

    if (!ts.canHaveModifiers(memberDeclaration)) {
        return false;
    }

    const memberModifiers: readonly ts.Modifier[] | undefined = ts.getModifiers(memberDeclaration);

    if (memberModifiers !== undefined) {
        for (const memberModifier of memberModifiers) {
            if (memberModifier.kind === modifierKind) {
                return true;
            }
        }
    }

    return false;
}

export function serializeConstructors(
    memberSymbols: ts.UnderscoreEscapedMap<ts.Symbol>,
    checker: ts.TypeChecker,
    options:any
): (Property | Method)[] {
  const result: (Property | Method)[] = [];

  if (memberSymbols !== undefined) {
      memberSymbols.forEach((memberSymbol: ts.Symbol): void => {
          const memberDeclarations: ts.NamedDeclaration[] | undefined = memberSymbol.getDeclarations();
          if (memberDeclarations === undefined) {
              return;
          }
          memberDeclarations.forEach((memberDeclaration: ts.NamedDeclaration): void => {
              if (isConstructor(memberDeclaration)) {
                  result.push(MethodFactory.create(memberSymbol, memberDeclaration, checker,options));
              }
          });
      });
  }

  return result;
}

export function serializeMethods(memberSymbols: ts.UnderscoreEscapedMap<ts.Symbol>, checker: ts.TypeChecker, options:any): (Property | Method)[] {
    const result: (Property | Method)[] = [];

    if (memberSymbols !== undefined) {
        memberSymbols.forEach((memberSymbol: ts.Symbol): void => {
            const memberDeclarations: ts.NamedDeclaration[] | undefined = memberSymbol.getDeclarations();
            if (memberDeclarations === undefined) {
                return;
            }
            memberDeclarations.forEach((memberDeclaration: ts.NamedDeclaration): void => {
                if (isMethod(memberDeclaration) && !options.onlyAssociations) {
                    result.push(MethodFactory.create(memberSymbol, memberDeclaration, checker,options));
                } else if (isProperty(memberDeclaration)) {
                    result.push(PropertyFactory.create(memberSymbol, memberDeclaration, checker, options));
                }
            });
        });
    }

    return result;
}

export function serializeTypeParameters(memberSymbols: ts.UnderscoreEscapedMap<ts.Symbol>, checker: ts.TypeChecker, options:any): TypeParameter[] {
    const result: TypeParameter[] = [];

    if (memberSymbols !== undefined) {
        memberSymbols.forEach((memberSymbol: ts.Symbol): void => {
            const memberDeclarations: ts.NamedDeclaration[] | undefined = memberSymbol.getDeclarations();
            if (memberDeclarations === undefined) {
                return;
            }
            memberDeclarations.forEach((memberDeclaration: ts.NamedDeclaration): void => {
                if (isTypeParameter(memberDeclaration)) {
                    result.push(TypeParameterFactory.create(memberSymbol, memberDeclaration, checker,options));
                }
            });
        });
    }

    return result;
}

export function hasInitializer(declaration: ts.ParameterDeclaration): boolean {
    return declaration.initializer !== undefined;
}

export function isOptional(declaration: ts.PropertyDeclaration | ts.ParameterDeclaration | ts.MethodDeclaration): boolean {
    return declaration.questionToken !== undefined;
}

export function getNamespace(symbol: ts.Symbol): string{
    if(symbol==undefined)
        return "";
    if((<any>symbol).parent && (<any>symbol).parent.declarations && (<any>symbol).parent.declarations[0].kind === ts.SyntaxKind.ModuleDeclaration){
        const parent: any=(<any>symbol).parent;
        let ns=(<any>symbol).parent.name;
        if((<any>parent).parent && (<any>parent).parent.declarations[0].kind === ts.SyntaxKind.ModuleDeclaration)
            ns= getNamespace(parent)+"."+ns;
        return ns;
    }else{
        return "";
    }
}

export function getSourceCode(symbol:ts.Symbol){
    if((<any>symbol).parent && (<any>symbol).parent.valueDeclaration.kind !== ts.SyntaxKind.SourceFile){
        const parent: any=(<any>symbol).parent;
        
        if((<any>parent).valueDeclaration.parent.kind !== ts.SyntaxKind.SourceFile)
            return getSourceCode(parent);
        else
            return (<any>parent).valueDeclaration.parent;   

    }else{
        return null;
    }    
}

export function getImports(source:any):string[]{
    let importedNamespaces:string[]=[];    
    let st:any=source.statements;
    if(st){
        st.forEach( (n:any)=> {
            let importedNamespaces2:string[]=getImports2(n);
            if(importedNamespaces2.length>0)
                importedNamespaces=importedNamespaces.concat(importedNamespaces2);
        });
    }else{
        let importedNamespaces2:string[]=getImports2(source.nextContainer);
        if(importedNamespaces2.length>0)
            importedNamespaces=importedNamespaces.concat(importedNamespaces2);
    }
    return importedNamespaces;
}

function getImports2(n: any):string[]{
    let importedNamespaces:string[]=[];
    if(n==undefined)
        return importedNamespaces;
    if(n.body && n.body.statements){
        n.body.statements.forEach((element:any) => {
            if(element.moduleReference){
                 let importedNamespace:string=getLeftRightRecursiveToStringAsNamespace(element.moduleReference,"");
                 if(importedNamespace!="")
                    importedNamespaces.push(importedNamespace);
            }
        });   
    }

    if(n.kind === ts.SyntaxKind.ModuleDeclaration ){
        let importedNamespaces2:string[]= getImports(n.nextContainer);
        if(importedNamespaces2.length>0)
            importedNamespaces=importedNamespaces.concat(importedNamespaces2);
    }
    return importedNamespaces;
}

function getLeftRightRecursiveToStringAsNamespace(moduleReference : any,acum : string):string{
    let aux:string = acum;
    if(moduleReference.left){
        if(moduleReference.left.escapedText){
            aux+=(aux!="")?".":"";
            aux+=moduleReference.left.escapedText;
        }
        aux=getLeftRightRecursiveToStringAsNamespace(moduleReference.left,aux);
    }
    if(moduleReference.right){
        if(moduleReference.right.escapedText){
            aux+=(aux!="")?".":"";
            aux+=moduleReference.right.escapedText;
        }
        aux=getLeftRightRecursiveToStringAsNamespace(moduleReference.right,aux);
    }
    return aux;
}

export function getModuleName(propertyTypeFile: string, options: any): string {
    for(let i=0;i<options.modules.length;i++){
        if(options.modules[i].sources.includes(propertyTypeFile))
            return options.modules[i].moduleName;
    }
    return "";
}
export function getComponentTagFromJavascriptClassName(fileName: string): string {
   let out:string='';
    for(let i=0;i<fileName.length;i++){
        if(i!=0 && fileName.charCodeAt(i)>=65 && fileName.charCodeAt(i)<=90){
            out+="-"+fileName.charAt(i).toLowerCase();
        }else if(fileName.charAt(i)=="."){
            break;
        }else{
            out+=fileName.charAt(i).toLowerCase();
        }
   }
   return out;
}

export function getAssociativeParts(part: IComponentComposite): IComponentComposite[]{
    const out: IComponentComposite[]=[];
    if (part.componentKind === ComponentKind.CLASS ||
        part.componentKind === ComponentKind.INTERFACE ||
        part.componentKind === ComponentKind.ENUM
    ) {
        out.push(part);
    }else if (part.componentKind === ComponentKind.NAMESPACE) {
        (<Namespace> part ).parts.forEach((element1: any) => {
            const temp: IComponentComposite[]=getAssociativeParts(element1);
            temp.forEach((element2: any) => {
                out.push(element2);
            });
        }); 
    }else if (part.componentKind === ComponentKind.FILE) {
        (<File> part ).parts.forEach((element1: any) => {
            const temp: IComponentComposite[]=getAssociativeParts(element1);
            temp.forEach((element2: any) => {
                out.push(element2);
            });
        }); 
    }
    return out;
}
/*
function processRecursiveDom(path: string, node: Node, tag: string, Class: Class, options: any): IComponentComposite[] {
    node.childNodes.forEach((child:Node)=>{
        options.
        if(==
    });
}

*/

export function initializeRegistry(
    fileNames: ReadonlyArray<string> ,
    options: ts.CompilerOptions = ts.getDefaultCompilerOptions(),
    additionalOptions:any
): IComponentComposite[] {
    let result : IComponentComposite[]=[];
    // Build a program using the set of root file names in fileNames
    let program = ts.createProgram(fileNames.filter((f:string)=>{return f.endsWith(".ts")}), options);
    let Class : Class |undefined;
    

    let tpls:string[]=fileNames.filter((p:string)=>{return p.endsWith(".html")});
    tpls.forEach((template:string)=>{
        let tag:string|undefined;
        //console.log("processing "+template);
        let templatePath:string=(<any>template).replaceAll(/\\/gi,"/");
        let classPath:string=(<any>templatePath).replaceAll(/(\.tpl)?\.html/gi,".ts");
        let tsSources:ts.SourceFile[]=program.getSourceFiles().filter((s:ts.SourceFile)=>{return s.fileName==classPath});
        if(tsSources.length==0){
            let templateName:string=templatePath.substring(templatePath.lastIndexOf("/")+1,templatePath.lastIndexOf("."));
            tag=AngularJSComponentFactory.getComponentTagFromJavascriptClassName(templateName);
        }else{
            let file2: File | undefined = FileFactory.create(tsSources[0].fileName, tsSources[0], program.getTypeChecker(),additionalOptions);
            let className:string=classPath.substring(classPath.lastIndexOf("/")+1,classPath.lastIndexOf("."));
            let Classes:IComponentComposite[]=AngularJSComponentFactory.getAssociativeParts(file2);
            Class =<Class>Classes[0];
            tag=AngularJSComponentFactory.getComponentTagFromJavascriptClassName(className);
        }
        let dom:JSDOM= readDom(template);
        const angularComponent: AngularJSComponent = AngularJSComponentFactory.create(template,<Node>dom.window.document,tag,Class, additionalOptions);
        result.push(angularComponent);
        AngularJSComponentFactory.getComponentRegistry().set(tag,angularComponent);
    });
    
    return result;
}

function readDom(path: string): JSDOM {
    const fileContent:any = require('fs').readFileSync(path);
    return new JSDOM(fileContent);

}

export function initializeTree(
        fileNames: ReadonlyArray<string> ,
        _options: ts.CompilerOptions = ts.getDefaultCompilerOptions(),
        additionalOptions:any
    ): IComponentComposite[] {
        let result : IComponentComposite[]=[];
        let tpls:string[]=fileNames.filter((p:string)=>{return p.endsWith(".html")});
        tpls.forEach((template:string)=>{
			let classPath:string=(<any>template).replaceAll(/\\/gi,"/").replaceAll(/(\.tpl)?\.html/gi,".ts");
            let className:string=classPath.substring(classPath.lastIndexOf("/")+1,classPath.lastIndexOf("."));
            let tag:string=AngularJSComponentFactory.getComponentTagFromJavascriptClassName(className);
            let component :AngularJSComponent|undefined=AngularJSComponentFactory.getComponentRegistry().get(tag);
            if(component){
                const angularInstance: AngularJSComponentInstance = AngularJSComponentFactory.createInstance(tag,component, additionalOptions);
                readAdditionalControllers(tag,angularInstance,template,additionalOptions);
                result=result.concat(angularInstance);
            }else{
                console.log("j");
            }
        });
        
        return result;
    }
export function createInstance(componentPath:string, component : AngularJSComponent, additionalOptions: any): AngularJSComponentInstance {
    let instance : AngularJSComponentInstance =new AngularJSComponentInstance(componentPath,component);
    let parts:AngularJSComponentInstance[]=[];
    component.node.childNodes.forEach( (node:Node)=>{
        let childComponent:AngularJSComponent |undefined=componentRegistry.get(node.nodeName.toLowerCase());
        if(childComponent){
            parts=parts.concat(createInstance(componentPath,childComponent, additionalOptions));
        }else{
            parts=parts.concat(createInstanceForNonComponentNode(componentPath,node, additionalOptions));
        }
    });
    instance.parts=instance.parts.concat(parts);
    return instance;
}

function createInstanceForNonComponentNode(componentPath:string,node : Node, additionalOptions: any): AngularJSComponentInstance []{
    let parts:AngularJSComponentInstance[]=[];
    node.childNodes.forEach( (node:Node)=>{
        let childComponent:AngularJSComponent |undefined=componentRegistry.get(node.nodeName.toLowerCase());
        if(childComponent){
            //check non-recursive tag definition
            if(componentPath.lastIndexOf("/")==-1 || (componentPath.lastIndexOf("/")!=-1 && componentPath.substring(componentPath.lastIndexOf("/")+1)!=node.nodeName.toLowerCase()))
                parts=parts.concat(createInstance(componentPath+"/"+node.nodeName.toLowerCase(),childComponent, additionalOptions));
            else
                console.log("");
        }else{
            parts=parts.concat(createInstanceForNonComponentNode(componentPath,node, additionalOptions));
        }
        
    });
    return parts;
}
function readAdditionalControllers(componentPath:string,angularInstance: AngularJSComponentInstance, template: string,additionalOptions:any) {
    try{
        const fileContent:any = require('fs').readFileSync((<any>template).replaceAll(".html",".ts"));
        let controllers:string[]=fileContent.toString().match(/\{([^\}]*)(\s|,)controller\s*:\s*([^,]*),([^\}]*)resolve\s*:\s*\{([^\}]*)}/g);
        if(controllers!=null){
            controllers.forEach((matched:string)=>{
                let controller:string=(<any>matched).match(/( |,)+controller\s*:\s*([^,]*),.*/gi)[0].replace(/.*controller\s*:\s*([^,]*),.*/,"$1");
                let tagName:string=AngularJSComponentFactory.getComponentTagFromJavascriptClassName(controller);
                let newControllerComponent:AngularJSComponent|undefined=componentRegistry.get(tagName);
                let newController:AngularJSComponentInstance=AngularJSComponentFactory.createInstance(componentPath+"/"+tagName,newControllerComponent!, additionalOptions);
                angularInstance.parts=angularInstance.parts.concat(newController);
            });
        }
    }catch(error){
        if(error.code!=="ENOENT") //in cases of templates without TS file, this can happen, so error under control
            throw error;
    }
}

