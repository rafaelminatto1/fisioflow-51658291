/**
 * ARIA Live Region Announcer
 * 
 * Provides screen reader announcements for dynamic content changes
 */

type AnnouncementPriority = 'polite' | 'assertive';

class AriaAnnouncer {
  private liveRegion: HTMLDivElement | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.createLiveRegion();
    }
  }

  private createLiveRegion(): void {
    // Create live region if it doesn't exist
    if (!this.liveRegion) {
      this.liveRegion = document.createElement('div');
      this.liveRegion.setAttribute('role', 'status');
      this.liveRegion.setAttribute('aria-live', 'polite');
      this.liveRegion.setAttribute('aria-atomic', 'true');
      this.liveRegion.className = 'sr-only';
      
      // Add to DOM
      document.body.appendChild(this.liveRegion);
    }
  }

  /**
   * Announce a message to screen readers
   */
  announce(message: string, priority: AnnouncementPriority = 'polite'): void {
    if (!this.liveRegion) {
      this.createLiveRegion();
    }

    if (this.liveRegion) {
      // Update priority
      this.liveRegion.setAttribute('aria-live', priority);
      
      // Clear previous message
      this.liveRegion.textContent = '';
      
      // Announce new message after a brief delay
      setTimeout(() => {
        if (this.liveRegion) {
          this.liveRegion.textContent = message;
        }
      }, 100);
    }
  }

  /**
   * Announce success message
   */
  announceSuccess(message: string): void {
    this.announce(`Sucesso: ${message}`, 'polite');
  }

  /**
   * Announce error message
   */
  announceError(message: string): void {
    this.announce(`Erro: ${message}`, 'assertive');
  }

  /**
   * Announce warning message
   */
  announceWarning(message: string): void {
    this.announce(`Aviso: ${message}`, 'polite');
  }

  /**
   * Announce info message
   */
  announceInfo(message: string): void {
    this.announce(`Informação: ${message}`, 'polite');
  }

  /**
   * Announce loading state
   */
  announceLoading(message: string = 'Carregando...'): void {
    this.announce(message, 'polite');
  }

  /**
   * Announce navigation
   */
  announceNavigation(pageName: string): void {
    this.announce(`Navegou para ${pageName}`, 'polite');
  }

  /**
   * Clear announcements
   */
  clear(): void {
    if (this.liveRegion) {
      this.liveRegion.textContent = '';
    }
  }

  /**
   * Destroy live region
   */
  destroy(): void {
    if (this.liveRegion && this.liveRegion.parentNode) {
      this.liveRegion.parentNode.removeChild(this.liveRegion);
      this.liveRegion = null;
    }
  }
}

// Export singleton instance
export const ariaAnnouncer = new AriaAnnouncer();
