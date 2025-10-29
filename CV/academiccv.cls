\NeedsTeXFormat{LaTeX2e}
\ProvidesClass{academiccv}[Minimal academic CV class]

% --- Base class ---
\LoadClass{article}

% --- Packages: keep it pdflatex-friendly ---
\RequirePackage[utf8]{inputenc}
\RequirePackage[T1]{fontenc}
\RequirePackage{lmodern}
\RequirePackage{microtype}
\RequirePackage[margin=1in]{geometry}
\RequirePackage{parskip} % block paragraphs; no indents, nice spacing
\RequirePackage{enumitem}
\setlist[itemize]{nosep,leftmargin=*}
\setlist[enumerate]{nosep,leftmargin=*}

% Links: no colors or boxes
\RequirePackage{hyperref}
\hypersetup{
  hidelinks,
  pdfcreator={},
  pdfproducer={}
}

% --- Page style ---
\pagestyle{plain}
\setlength{\tabcolsep}{0pt}

% --- Title block helpers ---
\makeatletter
\def\@name{}
\def\@subtitle{}
\def\@contact{}

\newcommand{\name}[1]{\def\@name{#1}}
\newcommand{\subtitle}[1]{\def\@subtitle{#1}}
\newcommand{\contact}[1]{\def\@contact{#1}}

\newcommand{\makecvtitle}{%
  \begin{center}
    {\Huge\bfseries \@name\par}
    \vspace{0.35em}
    {\normalsize \@subtitle\par}
    \vspace{0em}
    \ifx\@contact\@empty\else{\small \@contact\par}\fi
  \end{center}
  \vspace{0.5em}
}

% --- Section helpers (un-numbered, minimal) ---
\newcommand{\cvsection}[1]{%
  \section*{#1}%
  \vspace{-1.65em}\noindent\rule{\textwidth}{1pt}\vspace{0.5em}%
}
\newcommand{\cvsubsection}[1]{\subsection*{#1}}

% --- Compact lists for entries ---
\newenvironment{cvlist}{\begin{itemize}[leftmargin=1.2em]}{\end{itemize}}

% --- Education, Honors, Experience, etc. entries with date column ---
\newcommand{\cveducation}[4]{%
  \noindent\begin{tabular*}{\textwidth}{@{}p{0.20\textwidth}@{\hspace{0.05\textwidth}}p{0.75\textwidth}@{}}
    \raggedright \texttt{#1} &
    \parbox[t]{0.75\textwidth}{%
      \textbf{#2}\ifx&#3&\else, \textit{#3}\fi\\
      \ifx&#4&\else{\small #4}\fi
    }
  \end{tabular*}
  \vspace{0.25em}
}

\newcommand{\cvhonor}[3]{%
  \noindent\begin{tabular*}{\textwidth}{@{}p{0.1\textwidth}@{\hspace{0.05\textwidth}}p{0.85\textwidth}@{}}
    \raggedright \texttt{#1} &
    \parbox[t]{0.85\textwidth}{%
      \textbf{#2}\ifx&#3&\else, \textit{#3}\fi
    }
  \end{tabular*}
  \vspace{0.25em}
}

\newcommand{\cvexperience}[4]{%
  \noindent\begin{tabular*}{\textwidth}{@{}p{0.20\textwidth}@{\hspace{0.05\textwidth}}p{0.75\textwidth}@{}}
    \raggedright \texttt{#1} &
    \parbox[t]{0.75\textwidth}{%
      \textbf{#2}\ifx&#3&\else, \textit{#3}\fi\\
      \ifx&#4&\else{\small #4}\fi
    }
  \end{tabular*}
  \vspace{0.25em}
}

\newcommand{\cvsupervision}[4]{%
  \noindent\begin{tabular*}{\textwidth}{@{}p{0.225\textwidth}@{\hspace{0.025\textwidth}}p{0.75\textwidth}@{}}
    \raggedright \texttt{#1} &
    \parbox[t]{0.75\textwidth}{%
      \textbf{#2}\ifx&#3&\else, \textit{#3}\fi\\
      \ifx&#4&\else{\small #4}\fi
    }
  \end{tabular*}
  \vspace{-0.25em}
}

\newcommand{\cvteaching}[3]{%
  \noindent\begin{tabular*}{\textwidth}{@{}p{0.225\textwidth}@{\hspace{0.025\textwidth}}p{0.75\textwidth}@{}}
    \raggedright \texttt{#1} &
    \parbox[t]{0.75\textwidth}{%
      \textbf{#2}\ifx&#3&\else, \textit{#3}\fi
    }
  \end{tabular*}
  \vspace{-1em}
}

\newcommand{\cvcourse}[3]{%
  \noindent\parbox[t]{\textwidth}{%
    \textbf{#1}\ifx&#2&\else, \textit{#2}\fi\\
    \ifx&#3&\else{\small #3}\fi
  }
  \vspace{0.25em}
}

% --- Defaults that keep class minimalist ---
% Users should set \bibliographystyle{plainnat|abbrvnat|...} and \bibliography{file}

% End of class
