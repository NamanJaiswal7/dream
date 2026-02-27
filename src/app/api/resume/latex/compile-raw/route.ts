import { NextRequest, NextResponse } from 'next/server';

/**
 * Compile raw LaTeX to PDF using latex.ytotech.com API
 */
async function compileLatexToPdf(latex: string): Promise<ArrayBuffer> {
    const response = await fetch('https://latex.ytotech.com/builds/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            compiler: 'pdflatex',
            resources: [{ main: true, content: latex }],
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        console.error('[Compile] LaTeX compilation error:', error);
        throw new Error(`LaTeX compilation failed: ${error.substring(0, 200)}`);
    }

    return await response.arrayBuffer();
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { latex } = body as { latex: string };

        if (!latex) {
            return NextResponse.json(
                { error: 'latex is required' },
                { status: 400 }
            );
        }

        console.log('[API] Compiling raw LaTeX to PDF...');

        const pdfBuffer = await compileLatexToPdf(latex);

        return new Response(pdfBuffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
            },
        });
    } catch (error) {
        console.error('[API] Error compiling LaTeX:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to compile PDF' },
            { status: 500 }
        );
    }
}
