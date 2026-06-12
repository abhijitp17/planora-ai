/**
 * Context-Aware AI Prompt Suggestions
 * Generates dynamic suggestions based on platform state
 */

export function generateContextualPrompts(context: {
  activeModule: string;
  selectedSku?: { id: string; sysMape: number; cv: number; onHand: number; base: number };
  kpiSummary?: Record<string, string | number>;
}): string[] {
  const prompts: string[] = [];
  const { activeModule, selectedSku, kpiSummary } = context;

  // ── Demand Planning Context ────────────────────────────────────────────────
  if (activeModule === 'demand') {
    if (selectedSku) {
      // High MAPE → accuracy questions
      if (selectedSku.sysMape > 6.0) {
        prompts.push(`Why is MAPE high (${selectedSku.sysMape.toFixed(1)}%) for ${selectedSku.id}?`);
        prompts.push('Which model would improve accuracy for this SKU?');
      } else {
        prompts.push(`The forecast looks accurate (MAPE ${selectedSku.sysMape.toFixed(1)}%). Should I enable autopilot?`);
      }

      // High variability → model recommendations
      if (selectedSku.cv > 0.6) {
        prompts.push(`This SKU has high volatility (CV ${selectedSku.cv.toFixed(2)}). Recommend a model.`);
        prompts.push('Should I switch to Croston for intermittent demand?');
      }
    }
    
    prompts.push('What consensus adjustments would you recommend for next quarter?');
    prompts.push('Explain the difference between ARIMA and XGBoost for this data.');
  }

  // ── Inventory Context ───────────────────────────────────────────────────────
  if (activeModule === 'inventory') {
    if (selectedSku) {
      const dos = selectedSku.onHand / (selectedSku.base / 30);
      
      if (dos > 90) {
        prompts.push(`We have ${dos.toFixed(0)} days of supply for ${selectedSku.id}. How to reduce?`);
        prompts.push('Calculate the carrying cost of this excess inventory.');
      } else if (dos < 15) {
        prompts.push(`Only ${dos.toFixed(0)} days supply remaining. When should I reorder?`);
        prompts.push('What safety stock level would prevent this stockout risk?');
      }
    }

    prompts.push('Which SKUs should I liquidate to free working capital?');
    prompts.push('Recommend optimal service levels across my portfolio.');
    prompts.push('How can I reduce network inventory while maintaining service?');
  }

  // ── Analytics Context ───────────────────────────────────────────────────────
  if (activeModule === 'analytics') {
    prompts.push('What are the top 3 supply chain risks right now?');
    prompts.push('Which suppliers are underperforming and why?');
    prompts.push('Summarize inventory health across all locations.');
    prompts.push('What actions would have the biggest financial impact?');
  }

  // ── S&OP Context ────────────────────────────────────────────────────────────
  if (activeModule === 'sop') {
    prompts.push('Is our demand plan achievable with current capacity?');
    prompts.push("What's the revenue at risk from supply constraints?");
    prompts.push('Recommend capacity expansion vs margin sacrifice tradeoffs.');
  }

  // ── Finance Context ─────────────────────────────────────────────────────────
  if (activeModule === 'finance') {
    prompts.push("What's the P&L impact of a 10% demand drop?");
    prompts.push('Which product lines should we prioritize for margin?');
    prompts.push('Model the cash flow impact of inventory reduction.');
  }

  // Default fallbacks
  if (prompts.length < 4) {
    prompts.push('What should I focus on today?');
    prompts.push('Summarize the current state of the business.');
  }

  // Return up to 6 prompts, shuffled for variety
  return prompts.slice(0, 6);
}
