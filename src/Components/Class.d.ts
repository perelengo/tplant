import { ComponentKind } from '../Models/ComponentKind';
import { ComponentComposite, IComponentComposite } from '../Models/IComponentComposite';
export declare class Class extends ComponentComposite {
    readonly componentKind: ComponentKind;
    readonly fileName: string;
    isAbstract: boolean;
    isStatic: boolean;
    constructorMethods: IComponentComposite[];
    members: IComponentComposite[];
    extendsClass: string | undefined;
    extendsClassFile: string | undefined;
    implementsInterfaces: string[];
    implementsInterfacesFiles: string[];
    typeParameters: IComponentComposite[];
    namespace?: string;
    constructor(name: string, fileName: string);
}
