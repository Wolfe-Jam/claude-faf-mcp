/**
 * 🎯 MCP Fuzzy Detector - Friday Features Edition!
 * Google-style "close enough is good enough" matching
 * Ported from CLI v2.3.5 for MCP users
 */

interface FuzzyMatch {
  detected: boolean;
  type: string;
  confidence: 'high' | 'medium' | 'low';
  corrected?: string;
}

export class FuzzyDetector {
  /**
   * Common typos that MCP users make
   */
  private static readonly TYPO_CORRECTIONS: Record<string, string> = {
    // React typos
    'raect': 'react',
    'reat': 'react',
    'recat': 'react',
    'reaxt': 'react',

    // Chrome Extension typos
    'chrome extention': 'chrome extension',
    'chrom extension': 'chrome extension',
    'chrome exten': 'chrome extension',
    'chr ext': 'chrome extension',
    'ce': 'chrome extension',

    // TypeScript typos
    'typescipt': 'typescript',
    'typscript': 'typescript',
    'type script': 'typescript',
    'ts': 'typescript',

    // JavaScript typos
    'javscript': 'javascript',
    'javascrpt': 'javascript',
    'java script': 'javascript',
    'js': 'javascript',

    // Python typos
    'pyton': 'python',
    'pythong': 'python',
    'pyhton': 'python',
    'py': 'python',

    // Common framework typos
    'nexjs': 'nextjs',
    'next js': 'nextjs',
    'vuee': 'vue',
    'agular': 'angular',
    'agnular': 'angular',
    'sveltekit': 'svelte',
    'svelte kit': 'svelte'
  };

  /**
   * Detect Chrome Extension with fuzzy matching
   */
  static detectChromeExtension(text: string): FuzzyMatch {
    if (!text) {
      return { detected: false, type: '', confidence: 'low' };
    }

    const normalized = text.toLowerCase().trim();
    const corrected = this.correctTypos(normalized);

    // High confidence patterns
    const highConfidence = [
      'chrome extension',
      'browser extension',
      'chrome addon',
      'browser addon',
      'manifest.json',
      'chrome web store'
    ];

    for (const pattern of highConfidence) {
      if (corrected.includes(pattern)) {
        return {
          detected: true,
          type: 'chrome-extension',
          confidence: 'high',
          corrected: corrected !== normalized ? corrected : undefined
        };
      }
    }

    // Medium confidence patterns
    const mediumConfidence = [
      'extension',
      'browser',
      'chrome',
      'addon',
      'plugin'
    ];

    let matchCount = 0;
    for (const pattern of mediumConfidence) {
      if (corrected.includes(pattern)) matchCount++;
    }

    if (matchCount >= 2) {
      return {
        detected: true,
        type: 'chrome-extension',
        confidence: 'medium',
        corrected: corrected !== normalized ? corrected : undefined
      };
    }

    return { detected: false, type: '', confidence: 'low' };
  }

  /**
   * Detect project type with fuzzy matching
   */
  static detectProjectType(text: string): string {
    if (!text) return 'general';

    const normalized = text.toLowerCase().trim();
    const corrected = this.correctTypos(normalized);

    // Check for Chrome Extension first (Friday Feature!)
    const chromeCheck = this.detectChromeExtension(normalized);
    if (chromeCheck.detected) {
      return 'chrome-extension';
    }

    // React/Next.js
    if (corrected.includes('react') || corrected.includes('next')) {
      return 'react';
    }

    // Vue/Nuxt
    if (corrected.includes('vue') || corrected.includes('nuxt')) {
      return 'vue';
    }

    // Svelte/SvelteKit
    if (corrected.includes('svelte')) {
      return 'svelte';
    }

    // Angular
    if (corrected.includes('angular')) {
      return 'angular';
    }

    // Python frameworks
    if (corrected.includes('fastapi')) return 'python-fastapi';
    if (corrected.includes('django')) return 'python-django';
    if (corrected.includes('flask')) return 'python-flask';

    // API/Backend
    if (corrected.includes('api') || corrected.includes('backend')) {
      return 'node-api';
    }

    // CLI
    if (corrected.includes('cli') || corrected.includes('command')) {
      return 'cli-tool';
    }

    // Mobile
    if (corrected.includes('mobile') || corrected.includes('ios') || corrected.includes('android')) {
      return 'mobile';
    }

    return 'general';
  }

  /**
   * Correct common typos
   */
  private static correctTypos(text: string): string {
    let corrected = text;

    for (const [typo, correction] of Object.entries(this.TYPO_CORRECTIONS)) {
      const regex = new RegExp(`\\b${typo}\\b`, 'gi');
      corrected = corrected.replace(regex, correction);
    }

    return corrected;
  }

  /**
   * Get auto-fill slots for Chrome Extensions (90%+ scores!)
   */
  static getChromeExtensionSlots() {
    return {
      runtime: 'Chrome/Browser',
      hosting: 'Chrome Web Store',
      api_type: 'Chrome Extension APIs',
      backend: 'Service Worker',
      database: 'chrome.storage API',
      build: 'Webpack/Vite',
      package_manager: 'npm'
    };
  }

  /**
   * Smart suggestions for typos
   */
  static getSuggestion(input: string): string | null {
    const corrected = this.correctTypos(input.toLowerCase());
    if (corrected !== input.toLowerCase()) {
      return corrected;
    }
    return null;
  }
}

// Intel-Friday: Simple IF statements adding massive value!
export function applyIntelFriday(projectData: any): any {
  // IF: Chrome Extension detected → Auto-fill 7 slots for 90%+ score
  if (projectData.project_type === 'chrome-extension' ||
      FuzzyDetector.detectChromeExtension(projectData.description || '').detected) {
    const chromeSlots = FuzzyDetector.getChromeExtensionSlots();
    return {
      ...projectData,
      ...chromeSlots,
      _friday_feature: 'Chrome Extension auto-filled! 🎯'
    };
  }

  // IF: React detected → Add common React patterns
  if (projectData.framework?.includes('react')) {
    projectData.state_management = projectData.state_management || 'React Context/Redux';
    projectData.css_framework = projectData.css_framework || 'Tailwind CSS';
  }

  // IF: Python detected → Add common Python patterns
  if (projectData.language?.includes('python')) {
    projectData.package_manager = 'pip';
    projectData.runtime = 'Python 3.11+';
  }

  return projectData;
}

/**
 * Friday Features for MCP! 🎉
 *
 * Usage:
 * 1. Import in your MCP handler
 * 2. Use FuzzyDetector.detectProjectType() on user input
 * 3. Apply applyIntelFriday() before scoring
 * 4. Watch scores jump to 90%+!
 */