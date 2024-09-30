import ts from 'typescript';
import { Method } from '../Components/Method';
import { Property } from '../Components/Property';
import { TypeParameter } from '../Components/TypeParameter';
import { IComponentComposite } from '../Models/IComponentComposite';
import { Modifier } from '../Models/Modifier';
import * as ClassFactory from './ClassFactory';
import * as EnumFactory from './EnumFactory';
import * as InterfaceFactory from './InterfaceFactory';
import * as MethodFactory from './MethodFactory';
import * as NamespaceFactory from './NamespaceFactory';
import * as PropertyFactory from './PropertyFactory';
import * as TypeParameterFactory from './TypeParameterFactory';

export function isNodeExported(node: ts.Node): boolean {
    return (node.flags & ts.ModifierFlags.Export) !== 0 ||
        node.parent.kind === ts.SyntaxKind.SourceFile ||
        node.parent.kind === ts.SyntaxKind.ModuleBlock;
}

export function create(fileName: string, node: ts.Node, checker: ts.TypeChecker, options:any): IComponentComposite[] {
    const componentComposites: IComponentComposite[] = [];

    ts.forEachChild(node, (childNode: ts.Node) => {

        // Only consider exported nodes
        if (!isNodeExported(childNode)) {
            return;
        }

        
    if (childNode.kind === ts.SyntaxKind.ClassDeclaration) {
        const currentNode: ts.ClassLikeDeclarationBase = <ts.ClassLikeDeclarationBase>childNode;
        if (currentNode.name === undefined) {
          return;
        }
        // This is a top level class, get its symbol
        const classSymbol: ts.Symbol | undefined = (<any>currentNode).symbol;
        if (classSymbol === undefined) {
          return;
        }
        componentComposites.push(ClassFactory.create(fileName, classSymbol, checker,options));

        // No need to walk any further, class expressions/inner declarations
        // cannot be exported
    } else if (childNode.kind === ts.SyntaxKind.InterfaceDeclaration) {
        const currentNode: ts.InterfaceDeclaration = <ts.InterfaceDeclaration>childNode;
        const interfaceSymbol: ts.Symbol | undefined = (<any>currentNode).symbol;
        if (interfaceSymbol === undefined) {
          return;
        }
        componentComposites.push(InterfaceFactory.create(interfaceSymbol, checker,options));
    } else if (childNode.kind === ts.SyntaxKind.ModuleDeclaration) {
        const currentNode: ts.NamespaceDeclaration = <ts.NamespaceDeclaration>childNode;
        const namespaceSymbol: any = (<any>currentNode);
        if (namespaceSymbol === undefined) {
          return;
        }
        componentComposites.push(NamespaceFactory.create(fileName, namespaceSymbol, checker, options));
    } else if (childNode.kind === ts.SyntaxKind.EnumDeclaration) {
        const currentNode: ts.EnumDeclaration = <ts.EnumDeclaration>childNode;
        const enumSymbol: ts.Symbol | undefined = (<any>currentNode).symbol;
        if (enumSymbol === undefined) {
          return;
        }
        componentComposites.push(EnumFactory.create(enumSymbol,options));

        return;
    }
      // Functions are not methods in PlantUML! The (fake) methods (that are functions) get placed in the PlantUML outside of a class, and it won't render.
      //  else if (childNode.kind === ts.SyntaxKind.FunctionDeclaration) {
      //   const currentNode: ts.FunctionDeclaration = <ts.FunctionDeclaration>childNode;
      //   if (currentNode.name === undefined) {
      //     return;
      //   }
      //   const functionSymbol: ts.Symbol | undefined = checker.getSymbolAtLocation(currentNode.name);
      //   if (functionSymbol === undefined) {
      //     return;
      //   }
      //   componentComposites.push(MethodFactory.create(functionSymbol, currentNode, checker));
      // }
    });

    return componentComposites;
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
    checker: ts.TypeChecker
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
                  result.push(MethodFactory.create(memberSymbol, memberDeclaration, checker));
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
                    result.push(MethodFactory.create(memberSymbol, memberDeclaration, checker));
                } else if (isProperty(memberDeclaration)) {
                    result.push(PropertyFactory.create(memberSymbol, memberDeclaration, checker));
                }
            });
        });
    }

    return result;
}

export function serializeTypeParameters(memberSymbols: ts.UnderscoreEscapedMap<ts.Symbol>, checker: ts.TypeChecker): TypeParameter[] {
    const result: TypeParameter[] = [];

    if (memberSymbols !== undefined) {
        memberSymbols.forEach((memberSymbol: ts.Symbol): void => {
            const memberDeclarations: ts.NamedDeclaration[] | undefined = memberSymbol.getDeclarations();
            if (memberDeclarations === undefined) {
                return;
            }
            memberDeclarations.forEach((memberDeclaration: ts.NamedDeclaration): void => {
                if (isTypeParameter(memberDeclaration)) {
                    result.push(TypeParameterFactory.create(memberSymbol, memberDeclaration, checker));
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