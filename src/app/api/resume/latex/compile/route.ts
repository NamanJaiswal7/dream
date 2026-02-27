import { NextRequest, NextResponse } from 'next/server';
import { LatexResumeData, LatexResumePersonalInfo } from '@/types';

type ResumeStyle = 'modern' | 'classic' | 'minimal' | 'executive';

/**
 * Escape special LaTeX characters
 */
function escapeLatex(text: string): string {
    if (!text) return '';
    return text
        .replace(/[\r\n]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/\\/g, '\\textbackslash ')
        .replace(/&/g, '\\&')
        .replace(/%/g, '\\%')
        .replace(/\$/g, '\\$')
        .replace(/#/g, '\\#')
        .replace(/_/g, '\\_')
        .replace(/\{/g, '\\{')
        .replace(/\}/g, '\\}')
        .replace(/~/g, '\\textasciitilde ')
        .replace(/\^/g, '\\textasciicircum ')
        .replace(/</g, '\\textless ')
        .replace(/>/g, '\\textgreater ');
}

/**
 * Convert bullets array to LaTeX format
 */
function bulletsToLatex(bullets: string[], style: ResumeStyle): string {
    if (!bullets || bullets.length === 0) {
        return style === 'minimal'
            ? '\\item Contributed to team objectives'
            : '\\resumeItem{Contributed to team objectives}';
    }
    const cmd = style === 'minimal' ? '\\item' : '\\resumeItem';
    return bullets
        .filter(b => b && b.trim().length > 0)
        .slice(0, 5)
        .map(b => `${cmd}{${escapeLatex(b)}}`)
        .join('\n        ');
}

/**
 * Build MODERN style LaTeX (with icons, color accents)
 */
function buildModernTemplate(data: LatexResumeData, personalInfo: LatexResumePersonalInfo): string {
    const exp = data.experiences || [];
    const proj = data.projects || [];
    const edu = data.education || [];
    const skills = data.skills || { languages: '', frameworks: '', cloud: '', databases: '', tools: '' };

    return `\\documentclass[11pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage{latexsym}
\\usepackage[empty]{fullpage}
\\usepackage{titlesec}
\\usepackage{marvosym}
\\usepackage[usenames,dvipsnames]{color}
\\usepackage{enumitem}
\\usepackage[hidelinks]{hyperref}
\\usepackage{fancyhdr}
\\usepackage{tabularx}
\\usepackage{xcolor}
\\usepackage{fontawesome5}

\\pagestyle{fancy}
\\fancyhf{}
\\renewcommand{\\headrulewidth}{0pt}
\\renewcommand{\\footrulewidth}{0pt}
\\addtolength{\\oddsidemargin}{-0.5in}
\\addtolength{\\evensidemargin}{-0.5in}
\\addtolength{\\textwidth}{1in}
\\addtolength{\\topmargin}{-.5in}
\\addtolength{\\textheight}{1.0in}
\\urlstyle{same}
\\raggedbottom
\\raggedright
\\setlength{\\tabcolsep}{0in}

\\definecolor{accent}{RGB}{0,100,180}
\\titleformat{\\section}{\\vspace{-4pt}\\scshape\\raggedright\\large\\color{accent}}{}{0em}{}[\\color{accent}\\titlerule \\vspace{-5pt}]

\\newcommand{\\resumeItem}[1]{\\item\\small{#1 \\vspace{-2pt}}}
\\newcommand{\\resumeSubheading}[4]{\\vspace{-2pt}\\item\\begin{tabular*}{\\textwidth}[t]{l@{\\extracolsep{\\fill}}r}\\textbf{#1} & #2 \\\\ \\textit{\\small#3} & \\textit{\\small #4} \\end{tabular*}\\vspace{-7pt}}
\\newcommand{\\resumeProjectHeading}[2]{\\item\\begin{tabular*}{\\textwidth}{l@{\\extracolsep{\\fill}}r}\\small#1 & #2\\end{tabular*}\\vspace{-7pt}}
\\newcommand{\\resumeSubHeadingListStart}{\\begin{itemize}[leftmargin=0.15in, label={}]}
\\newcommand{\\resumeSubHeadingListEnd}{\\end{itemize}}
\\newcommand{\\resumeItemListStart}{\\begin{itemize}}
\\newcommand{\\resumeItemListEnd}{\\end{itemize}\\vspace{-5pt}}

\\begin{document}

\\begin{center}
    {\\Huge \\scshape\\color{accent} ${escapeLatex(personalInfo.name)}} \\\\ \\vspace{4pt}
    \\small \\faPhone\\ ${escapeLatex(personalInfo.phone)} \\quad
    \\href{mailto:${personalInfo.email}}{\\faEnvelope\\ ${escapeLatex(personalInfo.email)}} \\quad
    \\href{${personalInfo.linkedin}}{\\faLinkedin\\ LinkedIn}
\\end{center}

\\section{Summary}
\\small ${escapeLatex(data.summary)}

\\section{Experience}
\\resumeSubHeadingListStart
${exp.map(e => `\\resumeSubheading{${escapeLatex(e.title)}}{${escapeLatex(e.dates)}}{${escapeLatex(e.company)}}{${escapeLatex(e.location)}}
\\resumeItemListStart
${bulletsToLatex(e.bullets, 'modern')}
\\resumeItemListEnd`).join('\n')}
\\resumeSubHeadingListEnd

\\section{Projects}
\\resumeSubHeadingListStart
${proj.map(p => `\\resumeProjectHeading{\\textbf{${escapeLatex(p.name)}} $|$ \\emph{${escapeLatex(p.tech)}}}{${escapeLatex(p.date || '')}}
\\resumeItemListStart
${bulletsToLatex(p.bullets, 'modern')}
\\resumeItemListEnd`).join('\n')}
\\resumeSubHeadingListEnd

\\section{Technical Skills}
\\begin{itemize}[leftmargin=0.15in, label={}]
\\small{\\item{
\\textbf{Languages}{: ${escapeLatex(skills.languages)}} \\\\
\\textbf{Frameworks}{: ${escapeLatex(skills.frameworks)}} \\\\
\\textbf{Cloud/DevOps}{: ${escapeLatex(skills.cloud)}} \\\\
\\textbf{Databases}{: ${escapeLatex(skills.databases)}} \\\\
\\textbf{Tools}{: ${escapeLatex(skills.tools)}}
}}
\\end{itemize}

\\section{Education}
\\resumeSubHeadingListStart
${edu.map(e => `\\resumeSubheading{${escapeLatex(e.institution)}}{${escapeLatex(e.location)}}{${escapeLatex(e.degree)}}{${escapeLatex(e.date)}}`).join('\n')}
\\resumeSubHeadingListEnd

\\end{document}`;
}

/**
 * Build CLASSIC style LaTeX (traditional, serif font)
 */
function buildClassicTemplate(data: LatexResumeData, personalInfo: LatexResumePersonalInfo): string {
    const exp = data.experiences || [];
    const proj = data.projects || [];
    const edu = data.education || [];
    const skills = data.skills || { languages: '', frameworks: '', cloud: '', databases: '', tools: '' };

    return `\\documentclass[11pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage{times}
\\usepackage[margin=0.75in]{geometry}
\\usepackage{enumitem}
\\usepackage[hidelinks]{hyperref}
\\usepackage{titlesec}

\\titleformat{\\section}{\\large\\bfseries}{}{0em}{}[\\hrule height 0.5pt]
\\titlespacing{\\section}{0pt}{12pt}{6pt}

\\newcommand{\\resumeItem}[1]{\\item\\small #1}
\\newcommand{\\resumeSubheading}[4]{\\textbf{#1} \\hfill #2 \\\\ \\textit{#3} \\hfill \\textit{#4}\\vspace{4pt}}

\\begin{document}

\\begin{center}
{\\LARGE \\textbf{${escapeLatex(personalInfo.name)}}} \\\\[4pt]
${escapeLatex(personalInfo.phone)} $\\bullet$ ${escapeLatex(personalInfo.email)} $\\bullet$ \\href{${personalInfo.linkedin}}{LinkedIn}
\\end{center}

\\section*{Professional Summary}
${escapeLatex(data.summary)}

\\section*{Professional Experience}
${exp.map(e => `\\resumeSubheading{${escapeLatex(e.title)}}{${escapeLatex(e.dates)}}{${escapeLatex(e.company)}}{${escapeLatex(e.location)}}
\\begin{itemize}[leftmargin=0.2in]
${bulletsToLatex(e.bullets, 'classic')}
\\end{itemize}`).join('\n\\vspace{6pt}\n')}

\\section*{Projects}
${proj.map(p => `\\textbf{${escapeLatex(p.name)}} -- \\textit{${escapeLatex(p.tech)}}
\\begin{itemize}[leftmargin=0.2in]
${bulletsToLatex(p.bullets, 'classic')}
\\end{itemize}`).join('\n\\vspace{4pt}\n')}

\\section*{Technical Skills}
\\begin{itemize}[leftmargin=0.2in, label={--}]
\\item \\textbf{Languages:} ${escapeLatex(skills.languages)}
\\item \\textbf{Frameworks:} ${escapeLatex(skills.frameworks)}
\\item \\textbf{Cloud/DevOps:} ${escapeLatex(skills.cloud)}
\\item \\textbf{Databases:} ${escapeLatex(skills.databases)}
\\item \\textbf{Tools:} ${escapeLatex(skills.tools)}
\\end{itemize}

\\section*{Education}
${edu.map(e => `\\textbf{${escapeLatex(e.institution)}} \\hfill ${escapeLatex(e.location)} \\\\
${escapeLatex(e.degree)} \\hfill ${escapeLatex(e.date)}`).join('\n\\vspace{4pt}\n')}

\\end{document}`;
}

/**
 * Build MINIMAL style LaTeX (clean, lots of white space)
 */
function buildMinimalTemplate(data: LatexResumeData, personalInfo: LatexResumePersonalInfo): string {
    const exp = data.experiences || [];
    const proj = data.projects || [];
    const edu = data.education || [];
    const skills = data.skills || { languages: '', frameworks: '', cloud: '', databases: '', tools: '' };

    return `\\documentclass[11pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage[margin=1in]{geometry}
\\usepackage{enumitem}
\\usepackage[hidelinks]{hyperref}
\\usepackage{parskip}

\\setlength{\\parindent}{0pt}
\\pagestyle{empty}

\\begin{document}

{\\Large \\textbf{${escapeLatex(personalInfo.name)}}}

\\smallskip
${escapeLatex(personalInfo.email)} | ${escapeLatex(personalInfo.phone)} | \\href{${personalInfo.linkedin}}{LinkedIn}

\\bigskip
\\textbf{SUMMARY}

\\smallskip
${escapeLatex(data.summary)}

\\bigskip
\\textbf{EXPERIENCE}

${exp.map(e => `\\medskip
\\textbf{${escapeLatex(e.title)}} at ${escapeLatex(e.company)} \\hfill ${escapeLatex(e.dates)}

${escapeLatex(e.location)}
\\begin{itemize}[leftmargin=0.15in, topsep=2pt, itemsep=1pt]
${bulletsToLatex(e.bullets, 'minimal')}
\\end{itemize}`).join('\n')}

\\bigskip
\\textbf{PROJECTS}

${proj.map(p => `\\medskip
\\textbf{${escapeLatex(p.name)}} (${escapeLatex(p.tech)})
\\begin{itemize}[leftmargin=0.15in, topsep=2pt, itemsep=1pt]
${bulletsToLatex(p.bullets, 'minimal')}
\\end{itemize}`).join('\n')}

\\bigskip
\\textbf{SKILLS}

\\smallskip
${escapeLatex(skills.languages)}, ${escapeLatex(skills.frameworks)}, ${escapeLatex(skills.cloud)}, ${escapeLatex(skills.databases)}, ${escapeLatex(skills.tools)}

\\bigskip
\\textbf{EDUCATION}

${edu.map(e => `\\medskip
\\textbf{${escapeLatex(e.institution)}} -- ${escapeLatex(e.degree)} \\hfill ${escapeLatex(e.date)}`).join('\n')}

\\end{document}`;
}

/**
 * Build EXECUTIVE style LaTeX (bold headers, sophisticated)
 */
function buildExecutiveTemplate(data: LatexResumeData, personalInfo: LatexResumePersonalInfo): string {
    const exp = data.experiences || [];
    const proj = data.projects || [];
    const edu = data.education || [];
    const skills = data.skills || { languages: '', frameworks: '', cloud: '', databases: '', tools: '' };

    return `\\documentclass[11pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage{palatino}
\\usepackage[margin=0.7in]{geometry}
\\usepackage{enumitem}
\\usepackage[hidelinks]{hyperref}
\\usepackage{titlesec}
\\usepackage{xcolor}

\\definecolor{darkblue}{RGB}{26,54,93}
\\titleformat{\\section}{\\Large\\bfseries\\color{darkblue}}{}{0em}{}
\\titlespacing{\\section}{0pt}{14pt}{8pt}

\\newcommand{\\resumeItem}[1]{\\item #1}

\\begin{document}

\\begin{center}
{\\Huge \\textbf{\\color{darkblue}${escapeLatex(personalInfo.name)}}} \\\\[8pt]
\\textit{${escapeLatex(personalInfo.phone)} $\\cdot$ ${escapeLatex(personalInfo.email)} $\\cdot$ \\href{${personalInfo.linkedin}}{LinkedIn}}
\\end{center}

\\vspace{8pt}
\\hrule height 1pt
\\vspace{12pt}

\\section*{Executive Summary}
${escapeLatex(data.summary)}

\\section*{Professional Experience}
${exp.map(e => `\\textbf{\\large ${escapeLatex(e.title)}} \\hfill ${escapeLatex(e.dates)} \\\\
\\textit{${escapeLatex(e.company)}, ${escapeLatex(e.location)}}
\\begin{itemize}[leftmargin=0.2in, topsep=4pt]
${bulletsToLatex(e.bullets, 'executive')}
\\end{itemize}`).join('\n\\vspace{8pt}\n')}

\\section*{Key Projects}
${proj.map(p => `\\textbf{${escapeLatex(p.name)}} | \\textit{${escapeLatex(p.tech)}}
\\begin{itemize}[leftmargin=0.2in, topsep=2pt]
${bulletsToLatex(p.bullets, 'executive')}
\\end{itemize}`).join('\n\\vspace{4pt}\n')}

\\section*{Core Competencies}
\\begin{tabular}{@{}ll@{}}
\\textbf{Languages:} & ${escapeLatex(skills.languages)} \\\\
\\textbf{Frameworks:} & ${escapeLatex(skills.frameworks)} \\\\
\\textbf{Cloud/DevOps:} & ${escapeLatex(skills.cloud)} \\\\
\\textbf{Data:} & ${escapeLatex(skills.databases)} \\\\
\\textbf{Tools:} & ${escapeLatex(skills.tools)} \\\\
\\end{tabular}

\\section*{Education}
${edu.map(e => `\\textbf{${escapeLatex(e.institution)}} \\hfill ${escapeLatex(e.location)} \\\\
\\textit{${escapeLatex(e.degree)}} \\hfill ${escapeLatex(e.date)}`).join('\n\\vspace{6pt}\n')}

\\end{document}`;
}

/**
 * Style settings interface
 */
interface StyleSettings {
    primaryColor?: string;
    fontFamily?: 'sans' | 'serif' | 'mono';
    fontSize?: 'small' | 'medium' | 'large';
    margins?: 'narrow' | 'normal' | 'wide';
    sectionSpacing?: 'compact' | 'normal' | 'relaxed';
    showIcons?: boolean;
    boldHeaders?: boolean;
}

/**
 * Convert hex color to RGB for LaTeX
 */
function hexToRgb(hex: string): string {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (result) {
        return `${parseInt(result[1], 16)},${parseInt(result[2], 16)},${parseInt(result[3], 16)}`;
    }
    return '0,100,180'; // Default blue
}

/**
 * Build custom template with user's style settings
 */
function buildCustomTemplate(data: LatexResumeData, personalInfo: LatexResumePersonalInfo, settings: StyleSettings): string {
    const exp = data.experiences || [];
    const proj = data.projects || [];
    const edu = data.education || [];
    const skills = data.skills || { languages: '', frameworks: '', cloud: '', databases: '', tools: '' };

    const color = hexToRgb(settings.primaryColor || '#0064B4');
    const fontSize = settings.fontSize === 'small' ? '10pt' : settings.fontSize === 'large' ? '12pt' : '11pt';
    const marginSize = settings.margins === 'narrow' ? '0.5in' : settings.margins === 'wide' ? '1in' : '0.75in';
    const spacing = settings.sectionSpacing === 'compact' ? '-6pt' : settings.sectionSpacing === 'relaxed' ? '0pt' : '-4pt';
    const fontPackage = settings.fontFamily === 'serif' ? '\\usepackage{times}' : settings.fontFamily === 'mono' ? '\\usepackage{courier}' : '';
    const iconPkg = settings.showIcons ? '\\usepackage{fontawesome5}' : '';
    const headerStyle = settings.boldHeaders ? '\\bfseries' : '';

    const phoneIcon = settings.showIcons ? '\\faPhone\\ ' : '';
    const emailIcon = settings.showIcons ? '\\faEnvelope\\ ' : '';
    const linkedinIcon = settings.showIcons ? '\\faLinkedin\\ ' : '';

    return `\\documentclass[${fontSize},a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
${fontPackage}
\\usepackage[margin=${marginSize}]{geometry}
\\usepackage{enumitem}
\\usepackage[hidelinks]{hyperref}
\\usepackage{titlesec}
\\usepackage{xcolor}
${iconPkg}

\\definecolor{primary}{RGB}{${color}}
\\titleformat{\\section}{\\vspace{${spacing}}\\${headerStyle}\\scshape\\raggedright\\large\\color{primary}}{}{0em}{}[\\color{primary}\\titlerule \\vspace{-5pt}]

\\newcommand{\\resumeItem}[1]{\\item\\small{#1 \\vspace{-2pt}}}
\\newcommand{\\resumeSubheading}[4]{\\vspace{-2pt}\\item\\begin{tabular*}{\\textwidth}[t]{l@{\\extracolsep{\\fill}}r}\\textbf{#1} & #2 \\\\ \\textit{\\small#3} & \\textit{\\small #4} \\end{tabular*}\\vspace{-7pt}}
\\newcommand{\\resumeProjectHeading}[2]{\\item\\begin{tabular*}{\\textwidth}{l@{\\extracolsep{\\fill}}r}\\small#1 & #2\\end{tabular*}\\vspace{-7pt}}
\\newcommand{\\resumeSubHeadingListStart}{\\begin{itemize}[leftmargin=0.15in, label={}]}
\\newcommand{\\resumeSubHeadingListEnd}{\\end{itemize}}
\\newcommand{\\resumeItemListStart}{\\begin{itemize}}
\\newcommand{\\resumeItemListEnd}{\\end{itemize}\\vspace{-5pt}}

\\pagestyle{empty}
\\raggedbottom
\\raggedright

\\begin{document}

\\begin{center}
    {\\Huge \\${headerStyle}\\scshape\\color{primary} ${escapeLatex(personalInfo.name)}} \\\\ \\vspace{4pt}
    \\small ${phoneIcon}${escapeLatex(personalInfo.phone)} \\quad
    \\href{mailto:${personalInfo.email}}{${emailIcon}${escapeLatex(personalInfo.email)}} \\quad
    \\href{${personalInfo.linkedin}}{${linkedinIcon}LinkedIn}
\\end{center}

\\section{Summary}
\\small ${escapeLatex(data.summary)}

\\section{Experience}
\\resumeSubHeadingListStart
${exp.map(e => `\\resumeSubheading{${escapeLatex(e.title)}}{${escapeLatex(e.dates)}}{${escapeLatex(e.company)}}{${escapeLatex(e.location)}}
\\resumeItemListStart
${bulletsToLatex(e.bullets, 'modern')}
\\resumeItemListEnd`).join('\n')}
\\resumeSubHeadingListEnd

\\section{Projects}
\\resumeSubHeadingListStart
${proj.map(p => `\\resumeProjectHeading{\\textbf{${escapeLatex(p.name)}} $|$ \\emph{${escapeLatex(p.tech)}}}{${escapeLatex(p.date || '')}}
\\resumeItemListStart
${bulletsToLatex(p.bullets, 'modern')}
\\resumeItemListEnd`).join('\n')}
\\resumeSubHeadingListEnd

\\section{Technical Skills}
\\begin{itemize}[leftmargin=0.15in, label={}]
\\small{\\item{
\\textbf{Languages}{: ${escapeLatex(skills.languages)}} \\\\
\\textbf{Frameworks}{: ${escapeLatex(skills.frameworks)}} \\\\
\\textbf{Cloud/DevOps}{: ${escapeLatex(skills.cloud)}} \\\\
\\textbf{Databases}{: ${escapeLatex(skills.databases)}} \\\\
\\textbf{Tools}{: ${escapeLatex(skills.tools)}}
}}
\\end{itemize}

\\section{Education}
\\resumeSubHeadingListStart
${edu.map(e => `\\resumeSubheading{${escapeLatex(e.institution)}}{${escapeLatex(e.location)}}{${escapeLatex(e.degree)}}{${escapeLatex(e.date)}}`).join('\n')}
\\resumeSubHeadingListEnd

\\end{document}`;
}

/**
 * Build LaTeX document based on style and settings
 */
function buildLatexDocument(data: LatexResumeData, personalInfo: LatexResumePersonalInfo, style: ResumeStyle, styleSettings?: StyleSettings): string {
    // If custom settings provided, use custom template builder
    if (styleSettings && Object.keys(styleSettings).length > 0) {
        return buildCustomTemplate(data, personalInfo, styleSettings);
    }

    // Otherwise use base templates
    switch (style) {
        case 'classic':
            return buildClassicTemplate(data, personalInfo);
        case 'minimal':
            return buildMinimalTemplate(data, personalInfo);
        case 'executive':
            return buildExecutiveTemplate(data, personalInfo);
        case 'modern':
        default:
            return buildModernTemplate(data, personalInfo);
    }
}

/**
 * Compile LaTeX to PDF
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
        throw new Error(`LaTeX compilation failed: ${error.substring(0, 500)}`);
    }

    return await response.arrayBuffer();
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { data, personalInfo, style = 'modern', styleSettings } = body as {
            data: LatexResumeData;
            personalInfo: LatexResumePersonalInfo;
            style?: ResumeStyle;
            styleSettings?: {
                primaryColor?: string;
                fontFamily?: 'sans' | 'serif' | 'mono';
                fontSize?: 'small' | 'medium' | 'large';
                margins?: 'narrow' | 'normal' | 'wide';
                sectionSpacing?: 'compact' | 'normal' | 'relaxed';
                showIcons?: boolean;
                boldHeaders?: boolean;
            };
        };

        if (!data || !personalInfo) {
            return NextResponse.json(
                { error: 'data and personalInfo are required' },
                { status: 400 }
            );
        }

        console.log(`[API] Compiling resume with style: ${style}, settings:`, styleSettings);

        const latex = buildLatexDocument(data, personalInfo, style, styleSettings);
        const pdfBuffer = await compileLatexToPdf(latex);

        return new Response(pdfBuffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="Resume.pdf"`,
            },
        });
    } catch (error) {
        console.error('[API] Error compiling resume:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to compile PDF' },
            { status: 500 }
        );
    }
}
