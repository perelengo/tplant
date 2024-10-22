import { ComponentKind } from '../Models/ComponentKind';
import { ComponentComposite, IComponentComposite } from '../Models/IComponentComposite';
export declare class File extends ComponentComposite {
    readonly componentKind: ComponentKind;
    parts: IComponentComposite[];
}
