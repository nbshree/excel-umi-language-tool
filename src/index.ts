import {readFile} from "xlsx";

const INPUT_FOLDER = "./input";
const OUTPUT_FOLDER = "./output";

const fs = require("fs");

const zhValueMap: Record<string, Record<string, string>> = {};
const enValueMap: Record<string, Record<string, string>> = {};

const readXlsx = (paths: string[]) => {
    const filePath = paths.join("/");
    if (filePath.endsWith(".xlsx") && !/\/~\$.*.xlsx$/.test(filePath)) {
        const xlsxFile = readFile(filePath);
        xlsxFile.SheetNames.forEach((name) => {
            const sheet = xlsxFile.Sheets[name];
            if (sheet["!ref"]) {
                const ranges = sheet["!ref"].split(":")[1];
                const line = Number(ranges.replace(/[^\d]/g, ''));
                for (let li = 2; li <= line; li++) {
                    const key = sheet[`A${li}`]?.v;
                    const cnValue = sheet[`B${li}`]?.v;
                    const enValue = sheet[`C${li}`]?.v;
                    if (key) {
                        const addGlobal = !key.includes('.');
                        const fileKey = addGlobal ? 'global' : key.split('.')[0];
                        const contentKey = addGlobal ? `${fileKey}.${key}` : key;
                        zhValueMap[fileKey] = {...zhValueMap[fileKey], [contentKey]: cnValue};
                        enValueMap[fileKey] = {...enValueMap[fileKey], [contentKey]: enValue};
                    } else {
                        break;
                    }
                }
            }
        });
    }
};

const createFiles = () => {
    readXlsx([INPUT_FOLDER, 'test.xlsx']);
    const finalLanguageTable = {
        'zh-CN': zhValueMap,
        'en-US': enValueMap,
    }
    Object.entries(finalLanguageTable).map(([key, map]) => {
        fs.mkdirSync([OUTPUT_FOLDER, key].join('/'), {recursive: true});
        Object.entries(map).map(([fileName, fm]) => {
            fs.writeFileSync(
                [OUTPUT_FOLDER, key, `${fileName}.ts`].join('/'),
                `/* eslint-disable @typescript-eslint/naming-convention */\nexport default ${JSON.stringify(
                    fm,
                    null,
                    '  '
                )}`
            );
        });

        const importStr = Object.keys(map)
            .map((path) => {
                return `import ${path} from './${key}/${path}';`;
            })
            .join('\n');
        const exportStr = Object.keys(map)
            .map((path) => {
                return `  ...${path}`;
            })
            .join(',\n');
        fs.writeFileSync(
            [OUTPUT_FOLDER, `${key}.ts`].join('/'),
            `${importStr}\n\nexport default {\n${exportStr}\n}`
        );
    });
}

fs.rm(OUTPUT_FOLDER, {recursive: true}, () => {
    console.log("Folder Deleted!");
    createFiles()
    console.log("Create Success!");
})
