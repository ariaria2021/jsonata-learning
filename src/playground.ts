import jsonata from 'jsonata';

export interface PlaygroundState {
    inputJson: string;
    expression: string;
    result: string;
    isError: boolean;
}

export async function evaluateExpression(inputJson: string, expression: string): Promise<{ result: string; isError: boolean }> {
    if (!expression.trim()) {
        return { result: '', isError: false };
    }

    let data: unknown;
    try {
        data = JSON.parse(inputJson);
    } catch (e) {
        return { result: `JSON解析エラー: ${(e as Error).message}`, isError: true };
    }

    try {
        const expr = jsonata(expression);
        const output = await expr.evaluate(data);
        if (output === undefined) {
            return { result: 'undefined (一致する結果なし)', isError: false };
        }
        return { result: JSON.stringify(output, null, 2), isError: false };
    } catch (e) {
        return { result: `JSONata エラー: ${(e as Error).message}`, isError: true };
    }
}
