export interface ICommandOptions {
    angularJSComponentsPathRegexp?: string;
    angularJSComponents: string[];
    targetClass?: string;
    associations: boolean;
    onlyInterfaces: boolean;
    format?: string;
    onlyClasses: boolean;
    customization?: string;  // optional customization file (plantuml include file)
    onlyAssociations?: boolean;
}
