export class Utilities {

    static getCSSVariable(variable) {
        // only works with pixels
        let rawVariable = getComputedStyle(document.body).getPropertyValue(`--${variable}`).replace('calc', '');
        while (rawVariable.includes('px'))
            rawVariable = rawVariable.replace('px', '');
        
        return eval(rawVariable);
    }
}
