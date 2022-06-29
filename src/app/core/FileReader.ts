export function readFileContent(file: File): Promise<string> {
    return new Promise<string>((resolve, reject) => {
            if (!file) {
                    resolve('');
            }

            const reader = new FileReader();

            reader.onload = (e) => {
                if (reader.result !== null) {
                    const text = reader.result.toString();
                    resolve(text);
                } else {
                    resolve("no data");
                }
            };

            reader.readAsText(file);
    });
}