/**
 * Slot Validator - FAF Compiler Engine MK3
 * Championship-grade slot validation with .faf content analysis
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import {
  SlotStatus,
  ValidationResult,
  UNIVERSAL_SLOTS,
} from '../types/slots';
import { ProjectType, SLOT_IGNORE_BY_TYPE } from '../types/project-types';

export class SlotValidator {
  /**
   * Validate all slots against project type
   */
  validate(fafContent: any, projectType: ProjectType): ValidationResult {
    const allSlots = UNIVERSAL_SLOTS;
    const ignoredSlots = SLOT_IGNORE_BY_TYPE[projectType];
    const relevantSlots = 21 - ignoredSlots.length;

    // Check each slot
    const slots: SlotStatus[] = allSlots.map(slot => {
      const slotName = slot.name;
      const isIgnored = ignoredSlots.includes(slotName);
      const isRequired = !isIgnored;
      const isFilled = this.isSlotFilled(slotName, fafContent);

      return {
        slotNumber: slot.number,
        slotName: slotName,
        required: isRequired,
        filled: isFilled,
        value: this.getSlotValue(slotName, fafContent),
        points: isFilled && isRequired ? 1 : 0,
      };
    });

    // Count filled slots (only count required slots)
    const filledSlots = slots.filter(s => s.required && s.filled).length;

    // Calculate score
    const score = Math.round((filledSlots / relevantSlots) * 100);

    // Determine medal
    const medal = this.getMedal(score);

    return {
      totalSlots: 21,
      relevantSlots,
      filledSlots,
      slots,
      score,
      medal,
    };
  }

  /**
   * Check if a specific slot is filled in .faf content
   */
  private isSlotFilled(slotName: string, fafContent: any): boolean {
    if (!fafContent) return false;

    // Map slot names to .faf structure
    switch (slotName) {
      // Core Project (Slots 1-4)
      case 'project_identity':
        return !!(
          fafContent.project?.name &&
          fafContent.project?.version
        );

      case 'language':
        return !!(
          fafContent.tech?.language ||
          fafContent.project?.primary_language
        );

      case 'human_context':
        return !!(
          fafContent.human_context?.what ||
          fafContent.human_context?.why ||
          fafContent.project?.goal
        );

      case 'documentation':
        return !!(
          fafContent.files?.readme ||
          fafContent.files?.claude_md ||
          fafContent.documentation
        );

      // Stack (Slots 5-14)
      case 'frontend':
        return !!(
          fafContent.tech?.frontend ||
          fafContent.stack?.frontend ||
          this.hasFramework(fafContent, ['react', 'vue', 'svelte', 'angular'])
        );

      case 'backend':
        return !!(
          fafContent.tech?.backend ||
          fafContent.stack?.backend ||
          this.hasFramework(fafContent, ['express', 'fastapi', 'nestjs', 'rails'])
        );

      case 'database':
        return !!(
          fafContent.tech?.database ||
          fafContent.stack?.database ||
          this.hasFramework(fafContent, ['postgresql', 'mongodb', 'mysql', 'supabase'])
        );

      case 'build_tool':
        return !!(
          fafContent.tech?.build ||
          fafContent.stack?.build_tool ||
          this.hasFramework(fafContent, ['vite', 'webpack', 'esbuild', 'rollup'])
        );

      case 'package_manager':
        return !!(
          fafContent.tech?.package_manager ||
          fafContent.stack?.package_manager ||
          this.hasFramework(fafContent, ['npm', 'pnpm', 'yarn', 'bun'])
        );

      case 'api':
        return !!(
          fafContent.tech?.api ||
          fafContent.stack?.api ||
          fafContent.api_type
        );

      case 'hosting':
        return !!(
          fafContent.tech?.hosting ||
          fafContent.stack?.hosting ||
          fafContent.deployment?.platform
        );

      case 'cicd':
        return !!(
          fafContent.tech?.cicd ||
          fafContent.stack?.cicd ||
          fafContent.ci_cd
        );

      case 'testing':
        return !!(
          fafContent.tech?.testing ||
          fafContent.stack?.testing ||
          this.hasFramework(fafContent, ['vitest', 'jest', 'pytest', 'mocha'])
        );

      case 'css':
        return !!(
          fafContent.tech?.css ||
          fafContent.stack?.styling ||
          this.hasFramework(fafContent, ['tailwind', 'css-modules', 'styled-components'])
        );

      // Architecture (Slots 15-21)
      case 'ui_library':
        return !!(
          fafContent.tech?.ui_library ||
          fafContent.stack?.ui_components ||
          this.hasFramework(fafContent, ['shadcn', 'mui', 'chakra'])
        );

      case 'state':
        return !!(
          fafContent.tech?.state ||
          fafContent.stack?.state_management ||
          this.hasFramework(fafContent, ['zustand', 'redux', 'mobx'])
        );

      case 'runtime':
        return !!(
          fafContent.tech?.runtime ||
          fafContent.stack?.runtime ||
          this.hasFramework(fafContent, ['node', 'deno', 'bun', 'browser'])
        );

      case 'auth':
        return !!(
          fafContent.tech?.auth ||
          fafContent.stack?.authentication ||
          fafContent.authentication
        );

      case 'storage':
        return !!(
          fafContent.tech?.storage ||
          fafContent.stack?.file_storage ||
          fafContent.storage
        );

      case 'caching':
        return !!(
          fafContent.tech?.caching ||
          fafContent.stack?.caching ||
          this.hasFramework(fafContent, ['redis', 'memcached'])
        );

      case 'team':
        return !!(
          fafContent.team ||
          fafContent.workflow ||
          fafContent.contributors
        );

      default:
        return false;
    }
  }

  /**
   * Get the value of a slot from .faf content
   */
  private getSlotValue(slotName: string, fafContent: any): any {
    if (!fafContent) return null;

    switch (slotName) {
      case 'project_identity':
        return {
          name: fafContent.project?.name,
          version: fafContent.project?.version,
          type: fafContent.project?.type,
        };
      case 'language':
        return fafContent.tech?.language || fafContent.project?.primary_language;
      case 'human_context':
        return fafContent.human_context;
      case 'frontend':
        return fafContent.tech?.frontend || fafContent.stack?.frontend;
      case 'backend':
        return fafContent.tech?.backend || fafContent.stack?.backend;
      case 'database':
        return fafContent.tech?.database || fafContent.stack?.database;
      case 'build_tool':
        return fafContent.tech?.build || fafContent.stack?.build_tool;
      case 'package_manager':
        return fafContent.tech?.package_manager || fafContent.stack?.package_manager;
      case 'api':
        return fafContent.tech?.api || fafContent.api_type;
      case 'hosting':
        return fafContent.tech?.hosting || fafContent.deployment?.platform;
      case 'cicd':
        return fafContent.tech?.cicd || fafContent.ci_cd;
      case 'testing':
        return fafContent.tech?.testing || fafContent.stack?.testing;
      case 'css':
        return fafContent.tech?.css || fafContent.stack?.styling;
      case 'ui_library':
        return fafContent.tech?.ui_library || fafContent.stack?.ui_components;
      case 'state':
        return fafContent.tech?.state || fafContent.stack?.state_management;
      case 'runtime':
        return fafContent.tech?.runtime || fafContent.stack?.runtime;
      case 'auth':
        return fafContent.tech?.auth || fafContent.authentication;
      case 'storage':
        return fafContent.tech?.storage || fafContent.storage;
      case 'caching':
        return fafContent.tech?.caching || fafContent.stack?.caching;
      case 'team':
        return fafContent.team || fafContent.workflow;
      default:
        return null;
    }
  }

  /**
   * Helper: Check if fafContent has a specific framework
   */
  private hasFramework(fafContent: any, frameworks: string[]): boolean {
    if (!fafContent) return false;

    // Check in various locations
    const techString = JSON.stringify(fafContent.tech || {}).toLowerCase();
    const stackString = JSON.stringify(fafContent.stack || {}).toLowerCase();
    const allString = JSON.stringify(fafContent).toLowerCase();

    return frameworks.some(fw => {
      const lowerFw = fw.toLowerCase();
      return techString.includes(lowerFw) ||
             stackString.includes(lowerFw) ||
             allString.includes(lowerFw);
    });
  }

  /**
   * Determine medal from score
   */
  private getMedal(score: number): 'trophy' | 'gold' | 'silver' | 'bronze' | 'red' | 'white' {
    if (score >= 85) return 'trophy'; // 🏆
    if (score >= 70) return 'gold';    // 🥇
    if (score >= 55) return 'silver';  // 🥈
    if (score >= 40) return 'bronze';  // 🥉
    if (score >= 20) return 'red';     // 🔴
    return 'white';                    // 🤍
  }

  /**
   * Load and parse .faf file from directory
   */
  static async loadFafFile(projectPath: string): Promise<any | null> {
    try {
      // Try .faf first
      let fafPath = path.join(projectPath, '.faf');

      if (!fs.existsSync(fafPath)) {
        // Try project.faf (v1.2.0 standard)
        fafPath = path.join(projectPath, 'project.faf');
      }

      if (!fs.existsSync(fafPath)) {
        return null;
      }

      const content = fs.readFileSync(fafPath, 'utf-8');
      return yaml.load(content);
    } catch (error) {
      console.error('Error loading .faf file:', error);
      return null;
    }
  }
}
