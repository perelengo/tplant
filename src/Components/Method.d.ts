import { ComponentKind } from '../Models/ComponentKind';
import { ComponentComposite, IComponentComposite } from '../Models/IComponentComposite';
import { Modifier } from '../Models/Modifier';
export declare class Method extends ComponentComposite {
    readonly componentKind: ComponentKind;
    parameters: IComponentComposite[];
    typeParameters: IComponentComposite[];
    returnType: string;
    returnTypeFile: string;
    modifier: Modifier;
    isAbstract: boolean;
    isAsync: boolean;
    isOptional: boolean;
    isStatic: boolean;
    returnTypeFullName: string;
}
