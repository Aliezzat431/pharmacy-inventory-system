// Robust JSON parsing to handle AI truncation/malformation
export function safeJsonParse(str) {
    if (!str) return {};
    try {
        return JSON.parse(str);
    } catch (e) {
        console.error("Initial JSON parse failed, attempting fix:", str);

        let sanitized = str.trim();

        // 1. Remove markdown code blocks
        if (sanitized.startsWith('```json')) {
            sanitized = sanitized.replace(/^```json\n?|\n?```$/g, '');
        } else if (sanitized.startsWith('```')) {
            sanitized = sanitized.replace(/^```\n?|\n?```$/g, '');
        }

        // 2. Clear trailing Garbage (like keys without values: "isGift":)
        // This removes trailing commas, colons, or property names at the very end
        sanitized = sanitized.replace(/,?\s*"[^"]*":?\s*$/, '');
        sanitized = sanitized.replace(/:\s*$/, '');
        sanitized = sanitized.replace(/,\s*$/, '');

        // 3. Close open brackets and braces
        let fixed = sanitized;
        const stack = [];
        for (let i = 0; i < fixed.length; i++) {
            const char = fixed[i];
            if (char === '{' || char === '[') {
                stack.push(char === '{' ? '}' : ']');
            } else if (char === '}' || char === ']') {
                if (stack.length > 0 && stack[stack.length - 1] === char) {
                    stack.pop();
                }
            }
        }

        // Handle unclosed quotes
        const totalQuotes = (fixed.match(/"/g) || []).length;
        if (totalQuotes % 2 !== 0) fixed += '"';

        // Add missing closers in reverse order
        while (stack.length > 0) {
            fixed += stack.pop();
        }

        try {
            return JSON.parse(fixed);
        } catch (e2) {
            console.error("Fixed JSON parse failed:", fixed);
            // Fallback: if we can't parse it, try to at least return an empty object if it's really bad
            // but for now, we throw so the system knows it failed.
            throw new Error("تنسيق المعاملات غير صحيح (JSON Malformed)");
        }
    }
}

// Authenticated internal API calls
export async function callInternalAPI(endpoint, method, token, body = null) {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    };

    if (body && method !== 'GET') {
        options.body = JSON.stringify(body);
    }

    const url = `${baseUrl}${endpoint}`;
    const response = await fetch(url, options);
    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || data.message || 'فشلت العملية');
    }

    return data;
}
