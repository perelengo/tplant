#!/usr/bin/env node

import Commander from 'commander';
import fs from 'fs';
import { GlobOptions, globSync } from 'glob'
import os from 'os';
import path from 'path';
import ts from 'typescript';
import * as tplant from './tplant';
import { encode } from 'plantuml-encoder';

const AVAILABLE_PLANTUML_EXTENSIONS: string[] = ['svg', 'png', 'txt'];

/* eslint-disable @typescript-eslint/no-var-requires */
const plantuml = require("node-plantuml");

const commander = new Commander.Command();

commander
    .version("3.1.2")
    .option('-i, --input <path>', 'Define the path of the Typescript file')
    .option('-e, --exclude <path>', 'File(s) to ignore')
    .option('-o, --output <path>', 'Define the path of the output file. If not defined, it\'ll output on the STDOUT')
    .option(
        '-p, --project <path>',
        'Compile a project given a valid configuration file.' +
        ' The argument can be a file path to a valid JSON configuration file,' +
        ' or a directory path to a directory containing a tsconfig.json file.'
    )
    .option('-A, --associations', 'Show associations between classes with cardinalities')
    .option('-I, --only-interfaces', 'Only output interfaces')
    .option('-R, --only-associations', 'Only output relations')
    .option('-M, --only-classes', 'Only output classes')
    .option('-f, --format <path>', 'Define the format of output')
    .option('-T, --targetClass <className>', 'Display class hierarchy diagram')
    .option('-c, --customize <path>', 'Customize the output diagram with an included plantuml file')
    .parse(process.argv);

const options: Commander.OptionValues = commander.opts();
options.input="C:/dev/EMA/CT2/Projects/ClinicalTrialWorkspaces/ct-common-ui/src/lib/common/assess/*.ts";
options.project="C:/dev/EMA/CT2/Projects/ClinicalTrialWorkspaces/ct-common-ui/tsconfig.json";
options.associations=true;
options.onlyAssociations=true;

if (!options.input) {
    console.error('Missing input file');
    process.exit(1);
}

const globOptions: GlobOptions = {};

if (options.exclude !== undefined) {
    globOptions.ignore = <string>options.exclude;
}


const matches = globSync(<string>options.input, globOptions) as string[];



const tsConfigFile: string | undefined = findTsConfigFile(<string>options.input, <string | undefined>options.tsconfig);

if (matches.length === 0) {
    console.error('No files found');
    process.exit(1);
}

// check to see if include file exists
if (options.customize !== undefined) {
    if (!fs.existsSync(<string>options.customize)) {
        console.error(`Warning: Customization file ${<string>options.customize} not found.`);
        process.exit(1);
    }
}

const plantUMLDocument: string = tplant.convertToPlant(
    tplant.generateDocumentation(matches, getCompilerOptions(tsConfigFile),
    {
        associations: <boolean>options.associations,
        onlyInterfaces: <boolean>options.onlyInterfaces,
        format: <string> options.format,
        targetClass: <string> options.targetClass,
        onlyClasses: <boolean> options.onlyClasses,
        customization: <string> options.customize,
        onlyAssociations: <boolean> options.onlyAssociations
    }
    ),
    {
        associations: <boolean>options.associations,
        onlyInterfaces: <boolean>options.onlyInterfaces,
        format: <string> options.format,
        targetClass: <string> options.targetClass,
        onlyClasses: <boolean> options.onlyClasses,
        customization: <string> options.customize,
        onlyAssociations: <boolean> options.onlyAssociations
    }
);

if (options.output === undefined) {
    console.log(plantUMLDocument);

    process.exit(0);
}

const extension: string = path.extname(<string>options.output)
    .replace(/^\./gm, '');

if (AVAILABLE_PLANTUML_EXTENSIONS.includes(extension)) {
    requestImageFile(<string>options.output, plantUMLDocument, extension);

    process.exit(0);
}

fs.writeFileSync(<string>options.output, plantUMLDocument, 'utf-8');

function findTsConfigFile(inputPath: string, tsConfigPath?: string): string | undefined {
    if (tsConfigPath !== undefined) {
        const tsConfigStats: fs.Stats = fs.statSync(tsConfigPath);
        if (tsConfigStats.isFile()) {
            return tsConfigPath;
        }
        if (tsConfigStats.isDirectory()) {
            const tsConfigFilePath: string = path.resolve(tsConfigPath, 'tsconfig.json');
            if (fs.existsSync(tsConfigFilePath)) {
                return tsConfigFilePath;
            }
        }
    }

    const localTsConfigFile: string = path.resolve(path.dirname(inputPath), 'tsconfig.json');
    if (fs.existsSync(localTsConfigFile)) {
        return localTsConfigFile;
    }

    const cwdTsConfigFile: string = path.resolve(process.cwd(), 'tsconfig.json');
    if (fs.existsSync(cwdTsConfigFile)) {
        return cwdTsConfigFile;
    }

    return;
}

function getCompilerOptions(tsConfigFilePath?: string): ts.CompilerOptions {
    if (tsConfigFilePath === undefined) {
        return ts.getDefaultCompilerOptions();
    }

    const reader: (path: string) => string | undefined =
        (filePath: string): string | undefined => fs.readFileSync(filePath, 'utf8');
    const configFile: { config?: { compilerOptions: ts.CompilerOptions }; error?: ts.Diagnostic } =
        ts.readConfigFile(tsConfigFilePath, reader);

    if (configFile.error !== undefined && configFile.error.category === ts.DiagnosticCategory.Error) {
        throw new Error(`unable to read tsconfig.json file at: ${tsConfigFilePath}.
             Error: ${ts.flattenDiagnosticMessageText(configFile.error.messageText, os.EOL)}`);
    } else if (configFile.config === undefined) {
        throw new Error(`unable to read tsconfig.json file at: ${tsConfigFilePath}.`);
    }

    const convertedCompilerOptions: {
        options: ts.CompilerOptions;
        errors: ts.Diagnostic[];
    } = ts.convertCompilerOptionsFromJson(configFile.config.compilerOptions, path.dirname(tsConfigFilePath));

    if (convertedCompilerOptions.errors.length > 0) {
        convertedCompilerOptions.errors.forEach((error: ts.Diagnostic): void => {
            if (error.category === ts.DiagnosticCategory.Error) {
                throw new Error(`unable to read tsconfig.json file at: ${tsConfigFilePath}.
                Error: ${ts.flattenDiagnosticMessageText(error.messageText, os.EOL)}`);
            }
        });
    }

    return convertedCompilerOptions.options;
}

function requestImageFile(output: string, input: string, extension: string): void {
    const decode = plantuml.decode(encode(input));
    const gen = plantuml.generate({ format: extension });
    decode.out.pipe(gen.in);
    gen.out.pipe(fs.createWriteStream(output));
}
