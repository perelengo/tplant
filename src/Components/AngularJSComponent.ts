import { ComponentKind } from '../Models/ComponentKind';
import { ComponentComposite } from '../Models/IComponentComposite';
import {Class} from './Class';
/**
 * Represents the metadata for a class within a typescript file.
 */
export class AngularJSComponent extends ComponentComposite {
    public readonly componentKind: ComponentKind = ComponentKind.INSTANCE_ANGULARJSCOMPONENT;
    public Class?: Class ;
    public moduleName?: string;
    public path: string;
    public node: Node;

    constructor(path: string, node :Node,tag:string,Class:Class | undefined){
        super(tag);
        this.Class = Class;
        this.path=path;
        this.node=node;
    }
}
