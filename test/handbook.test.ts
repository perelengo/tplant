import * as os from 'os';
import * as tplant from '../src/tplant';

describe('Parse Handbook codes', () => {

    it('generate PlantUML for Basic Types/BasicTypes.ts', () => {
        expect(tplant.convertToPlant(tplant.generateDocumentation(['test/Handbook/Basic Types/BasicTypes.ts'])))
            .toEqual(['@startuml',
                'namespace BasicTypes {',
                '    class Boolean {',
                '        +isDone: boolean',
                '    }',
                '    class Number {',
                '        +decimal: number',
                '        +hex: number',
                '        +binary: number',
                '        +octal: number',
                '    }',
                '    class String {',
                '        +color: string',
                '        +color2: string',
                '        +fullName: string',
                '        +age: number',
                '        +sentence: string',
                '        +sentence2: string',
                '    }',
                '    class Array2 {',
                '        +list: number[]',
                '        +list2: number[]', // Suposed to be +list2: Array<number>
                '    }',
                '    class Tuple {',
                '        +x: [string, number]',
                '        +x2: (string | number)[]',
                '        +x3: (string | number)[]',
                '    }',
                '    enum Color {',
                '        Red',
                '        Green',
                '        Blue',
                '    }',
                '    enum Color2 {',
                '        Red',
                '        Green',
                '        Blue',
                '    }',
                '    enum Color3 {',
                '        Red',
                '        Green',
                '        Blue',
                '    }',
                '    enum Color4 {',
                '        Red',
                '        Green',
                '        Blue',
                '    }',
                '    class Enum {',
                '        +c: Color',
                '        +c2: Color2',
                '        +c3: Color3',
                '        +colorName: string',
                '    }',
                '    class Any {',
                '        +notSure: any',
                '        +notSure2: string',
                '        +notSure3: boolean',
                '        +notSure4: any',
                '        +list: any[]',
                '    }',
                '    class Void {',
                '        +warnUser(): void',
                '        +unusable: void',
                '    }',
                '    class NullAndUndefined {',
                '        +u: undefined',
                '        +n: null',
                '    }',
                '    class Never {',
                '        +error(message: string): never',
                '        +fail(): never',
                '        +infiniteLoop(): never',
                '    }',
                '    interface Object {',
                '        +create(o: object): void', // Issue #26 - Suposed to be +create(o: object | null): void
                '    }',
                '    class TypeAssertions {',
                '        +someValue: any',
                '        +strLength: number',
                '        +someValue2: any',
                '        +strLength2: number',
                '    }',
                '}',
                '@enduml'].join(os.EOL));
    });

    it('generate PlantUML for Namespaces/Namespaces.ts', () => {
        expect(tplant.convertToPlant(tplant.generateDocumentation(['test/Handbook/Namespaces/Namespaces.ts'])))
            .toEqual(['@startuml',
                'interface StringValidator {',
                '    +isAcceptable(s: string): boolean',
                '}',
                'class LettersOnlyValidator implements StringValidator {',
                '    +isAcceptable(s: string): boolean',
                '}',
                'class ZipCodeValidator implements StringValidator {',
                '    +isAcceptable(s: string): boolean',
                '}',
                'namespace Validation {',
                '    interface StringValidator {',
                '        +isAcceptable(s: string): boolean',
                '    }',
                '    class LettersOnlyValidator implements Validation.StringValidator {',
                '        +isAcceptable(s: string): boolean',
                '    }',
                '    class ZipCodeValidator implements Validation.StringValidator {',
                '        +isAcceptable(s: string): boolean',
                '    }',
                '}',
                'namespace Validation2 {',
                '    interface StringValidator {',
                '        +isAcceptable(s: string): boolean',
                '    }',
                '}',
                'namespace Validation3 {',
                '    class LettersOnlyValidator implements StringValidator {',
                '        +isAcceptable(s: string): boolean',
                '    }',
                '}',
                'namespace Validation4 {',
                '    class ZipCodeValidator implements StringValidator {',
                '        +isAcceptable(s: string): boolean',
                '    }',
                '}',
                'namespace Shapes {',
                '    namespace Polygons {',
                '        class Triangle',
                '        class Square',
                '    }',
                '}',
                'namespace D3 {',
                '    interface Selectors {',
                '        +select: { (selector: string): Selection; (element: EventTarget): Selection; }',
                '    }',
                '    interface Event {',
                '        +x: number',
                '        +y: number',
                '    }',
                '    interface Base extends D3.Selectors {',
                '        +event: Event',
                '    }',
                '}',
                '@enduml'].join(os.EOL));
    });

    it('generate PlantUML for Interfaces/ExtendingInterfaces.ts', () => {
        expect(tplant.convertToPlant(tplant.generateDocumentation(['test/Handbook/Interfaces/ExtendingInterfaces.ts'])))
            .toEqual(`@startuml
interface Shape {
    +color: string
}
interface PenStroke {
    +penWidth: number
}
interface Square extends Shape, PenStroke {
    +sideLength: number
}
@enduml`);
    });
});
