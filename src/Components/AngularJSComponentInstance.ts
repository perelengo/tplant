import { IComponentComposite } from '../Models/IComponentComposite';
import { AngularJSComponent } from './AngularJSComponent';
/**
 * Represents the metadata for a class within a typescript file.
 */
export class AngularJSComponentInstance extends AngularJSComponent {
    public bindings: IComponentComposite[] = [];
    public parts: IComponentComposite[]=[];
    public component: AngularJSComponent;
    public componentPath: string;
    
    constructor(componentPath:string,component: AngularJSComponent) {
        super(component.path, component.node,component.name,component.Class);
        this.component=component;
        this.componentPath=componentPath;
    }
}
