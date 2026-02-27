import { NextRequest, NextResponse } from 'next/server';
import { generateLatexResume } from '@/services/ai';
import { UserProfile, Job } from '@/types';

/**
 * Compile LaTeX to PDF using latex.ytotech.com API
 * This is a free service that compiles LaTeX to PDF
 */
async function compileLatexToPdf(latex: string): Promise<ArrayBuffer> {
    const response = await fetch('https://latex.ytotech.com/builds/sync', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            compiler: 'pdflatex',
            resources: [
                {
                    main: true,
                    content: latex,
                },
            ],
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`LaTeX compilation failed: ${error}`);
    }

    return await response.arrayBuffer();
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { profile, job, compile } = body as {
            profile: UserProfile;
            job: Job;
            compile?: boolean;
        };

        if (!profile || !job) {
            return NextResponse.json(
                { error: 'Profile and job are required' },
                { status: 400 }
            );
        }

        console.log(`[API] Generating LaTeX resume for ${job.title} at ${job.company}`);

        const result = await generateLatexResume(profile, job);

        // If compile flag is set, compile to PDF and return binary
        if (compile) {
            console.log(`[API] Compiling LaTeX to PDF...`);
            try {
                const pdfBuffer = await compileLatexToPdf(result.latex);

                return new Response(pdfBuffer, {
                    status: 200,
                    headers: {
                        'Content-Type': 'application/pdf',
                        'Content-Disposition': `attachment; filename="Resume_${job.company.replace(/\s+/g, '_')}.pdf"`,
                    },
                });
            } catch (compileError) {
                console.error('[API] LaTeX compilation error:', compileError);
                // Fall back to returning LaTeX if compilation fails
                return NextResponse.json({
                    success: false,
                    error: 'PDF compilation failed. Download the .tex file instead.',
                    latex: result.latex,
                    content: result.content,
                    generatedAt: result.generatedAt.toISOString(),
                }, { status: 500 });
            }
        }

        // Return LaTeX content as JSON
        return NextResponse.json({
            success: true,
            latex: result.latex,
            content: result.content,
            generatedAt: result.generatedAt.toISOString(),
        });
    } catch (error) {
        console.error('[API] Error generating LaTeX resume:', error);
        return NextResponse.json(
            {
                error: 'Failed to generate LaTeX resume',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}
