/**
 * Function Calling Framework for AI Copilot
 * Enables Claude/GPT-4 to execute platform actions
 */

import { generateForecast, uploadDataset, autoMLForecast, batchForecast, buildExportUrl } from './api';
import { callProvider } from './aiProviders';

// ─────────────────────────────────────────────────────────────────────────────
// Tool Registry
// ─────────────────────────────────────────────────────────────────────────────
export const PLATFORM_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'run_forecast',
      description: 'Generate demand forecast for a specific SKU using ML models',
      parameters: {
        type: 'object',
        properties: {
          sku: { type: 'string', description: 'SKU identifier (e.g., ELE_TV_85_OLED)' },
          horizon: { type: 'number', description: 'Forecast horizon in periods (default: 6)' },
          model: { type: 'string', enum: ['xgboost', 'arima', 'hw', 'ensemble', 'automl'], description: 'Forecasting model to use' },
        },
        required: ['sku'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_sku_info',
      description: 'Get detailed information about a SKU including inventory, demand, and performance metrics',
      parameters: {
        type: 'object',
        properties: {
          sku: { type: 'string', description: 'SKU identifier' },
        },
        required: ['sku'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'calculate_safety_stock',
      description: 'Calculate recommended safety stock for a SKU at a given service level',
      parameters: {
        type: 'object',
        properties: {
          sku: { type: 'string', description: 'SKU identifier' },
          service_level: { type: 'number', description: 'Target service level (0.80 to 0.999)', default: 0.95 },
        },
        required: ['sku'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'adjust_consensus',
      description: 'Apply consensus adjustment to forecast periods',
      parameters: {
        type: 'object',
        properties: {
          sku: { type: 'string', description: 'SKU identifier' },
          periods: { type: 'array', items: { type: 'string' }, description: 'Period identifiers (e.g., ["2026-07", "2026-08"])' },
          adjustment_pct: { type: 'number', description: 'Adjustment percentage (e.g., 15 for +15%, -10 for -10%)' },
        },
        required: ['sku', 'periods', 'adjustment_pct'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'export_data',
      description: 'Export demand records, forecasts, or inventory data to CSV',
      parameters: {
        type: 'object',
        properties: {
          data_type: { type: 'string', enum: ['demand', 'forecast', 'inventory'], description: 'Type of data to export' },
          sku: { type: 'string', description: 'Optional: filter by SKU' },
          category: { type: 'string', description: 'Optional: filter by category' },
        },
        required: ['data_type'],
      },
    },
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Tool Execution
// ─────────────────────────────────────────────────────────────────────────────
export async function executePlatformTool(
  toolName: string,
  args: Record<string, any>,
  context: {
    selectedDataset: string;
    skuDatabase: any[];
    dispatch: any;
    toast: any;
    consensusAdjustments?: Record<string, number>;
  }
): Promise<{ success: boolean; result?: any; error?: string }> {
  const { selectedDataset, skuDatabase, dispatch, toast } = context;

  try {
    switch (toolName) {
      case 'run_forecast': {
        const { sku, horizon = 6, model = 'xgboost' } = args;
        
        if (model === 'automl') {
          const result = await autoMLForecast(selectedDataset, sku, horizon, true);
          dispatch({ type: 'SET_FORECAST_MODEL', payload: result.best_model });
          toast.success(`Forecast generated`, `Best model: ${result.best_model} (MAPE ${result.all_model_results[result.best_model].mape.toFixed(1)}%)`);
          return { success: true, result: { forecast: result.forecast, model: result.best_model, mape: result.all_model_results[result.best_model].mape } };
        } else {
          const result = await generateForecast({ dataset_version: selectedDataset, sku, horizon });
          toast.success('Forecast generated', `${sku} · ${horizon} periods`);
          return { success: true, result: { forecast: result.forecast[model], model } };
        }
      }

      case 'get_sku_info': {
        const { sku } = args;
        const skuData = skuDatabase.find(s => s.id === sku);
        if (!skuData) return { success: false, error: 'SKU not found' };
        
        return {
          success: true,
          result: {
            sku: skuData.id,
            name: skuData.name,
            category: skuData.category,
            base_demand: skuData.base,
            on_hand: skuData.onHand,
            in_transit: skuData.inTransit,
            unit_cost: skuData.unitCost,
            asp: skuData.asp,
            cv: skuData.cv,
            sys_mape: skuData.sysMape,
          }
        };
      }

      case 'calculate_safety_stock': {
        const { sku, service_level = 0.95 } = args;
        // Call dynamic safety stock API
        const result = await fetch(`http://localhost:8000/api/inventory/safety-stock/dynamic`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sku, dataset_version: selectedDataset, service_level }),
        }).then(r => r.json());
        
        toast.info('Safety stock calculated', `${result.safety_stock.toFixed(0)} units at ${(service_level*100).toFixed(1)}% SL`);
        return { success: true, result };
      }

      case 'adjust_consensus': {
        const { sku, periods, adjustment_pct } = args;
        // Update consensus adjustments in state
        const updates: Record<string, number> = {};
        periods.forEach((p: string) => { updates[p] = adjustment_pct; });
        dispatch({ type: 'SET_CONSENSUS', payload: { ...context.consensusAdjustments, ...updates } });
        
        toast.success('Consensus updated', `${periods.length} periods adjusted by ${adjustment_pct > 0 ? '+' : ''}${adjustment_pct}%`);
        return { success: true, result: { periods, adjustment_pct } };
      }

      case 'export_data': {
        const { data_type, sku, category } = args;
        const url = buildExportUrl(selectedDataset, sku, category);
        window.open(url, '_blank');
        toast.success('Export started', `${data_type} data downloading...`);
        return { success: true, result: { url } };
      }

      default:
        return { success: false, error: `Unknown tool: ${toolName}` };
    }
  } catch (err: any) {
    return { success: false, error: err.message || 'Tool execution failed' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Enhanced AI provider call with function calling
// ─────────────────────────────────────────────────────────────────────────────
export async function callProviderWithTools(
  config: any,
  messages: any[],
  systemPrompt: string,
  tools: any[],
  context: any,
  onChunk: (chunk: { delta: string; done: boolean }) => void,
  onToolUse?: (toolName: string, args: any, result: any) => void
): Promise<void> {
  // Only Claude and OpenAI support function calling currently
  if (!['claude', 'openai'].includes(config.providerId)) {
    // Fall back to regular call
    return callProvider(config, messages, systemPrompt, onChunk);
  }

  let fullResponse = '';
  const toolCalls: any[] = [];

  // Make API call with tools
  if (config.providerId === 'claude') {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: config.modelId,
        max_tokens: 1024,
        system: systemPrompt,
        messages: messages.map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content })),
        tools: tools.map(t => ({
          name: t.function.name,
          description: t.function.description,
          input_schema: t.function.parameters,
        })),
      }),
    });

    const data = await res.json();
    
    // Process response (may contain text + tool_use blocks)
    for (const block of data.content || []) {
      if (block.type === 'text') {
        fullResponse += block.text;
        onChunk({ delta: block.text, done: false });
      } else if (block.type === 'tool_use') {
        // Execute tool
        const toolResult = await executePlatformTool(block.name, block.input, context);
        toolCalls.push({ name: block.name, input: block.input, result: toolResult });
        
        if (onToolUse) onToolUse(block.name, block.input, toolResult);
        
        // Add tool result to response
        const resultText = `\n\n[Executed: ${block.name}]\nResult: ${JSON.stringify(toolResult.result || toolResult.error, null, 2)}`;
        fullResponse += resultText;
        onChunk({ delta: resultText, done: false });
      }
    }
  } else if (config.providerId === 'openai') {
    // OpenAI function calling (similar pattern)
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.apiKey}` },
      body: JSON.stringify({
        model: config.modelId,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages.map(m => ({ role: m.role, content: m.content })),
        ],
        tools,
        tool_choice: 'auto',
      }),
    });

    const data = await res.json();
    const message = data.choices[0].message;

    if (message.content) {
      fullResponse = message.content;
      onChunk({ delta: message.content, done: false });
    }

    if (message.tool_calls) {
      for (const toolCall of message.tool_calls) {
        const args = JSON.parse(toolCall.function.arguments);
        const toolResult = await executePlatformTool(toolCall.function.name, args, context);
        
        if (onToolUse) onToolUse(toolCall.function.name, args, toolResult);
        
        const resultText = `\n\n[Executed: ${toolCall.function.name}]\n${JSON.stringify(toolResult.result || toolResult.error, null, 2)}`;
        fullResponse += resultText;
        onChunk({ delta: resultText, done: false });
      }
    }
  }

  onChunk({ delta: '', done: true });
}
