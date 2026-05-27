// Hotel Mis Sueños — Apps Script API bridge for GitHub Pages
// This file keeps the existing frontend code working by emulating google.script.run.
// No demos. No secrets. All sensitive work stays in Apps Script.

(function () {
  function getApiUrl() {
    if (!window.HMS_CONFIG || !window.HMS_CONFIG.API_URL || window.HMS_CONFIG.API_URL.includes('PASTE_')) {
      throw new Error('Configura HMS_CONFIG.API_URL en js/config.js con tu Web App URL de Apps Script.');
    }
    return window.HMS_CONFIG.API_URL;
  }

  async function apiCall(action, payload) {
    const response = await fetch(getApiUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: action, payload: payload || {} })
    });

    const text = await response.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch (err) {
      throw new Error('Respuesta inválida del API. Revisa que Apps Script esté desplegado como Web App y que permita acceso.');
    }

    if (!json.success) {
      throw new Error(json.error || 'API error: ' + action);
    }

    return json.data;
  }

  function mapArgsToPayload(functionName, args) {
    switch (functionName) {
      case 'loginUser':
        return { username: args[0], password: args[1] };
      case 'getUsersAdminPayload':
        return { requestedBy: args[0] };
      case 'createUserAdmin':
        return { user: args[0], createdBy: args[1] };
      case 'getCashPayload':
        return { role: args[0], selectedDate: args[1], userName: args[2] };
      case 'submitCashMovement':
      case 'addCashMovement':
        return { movement: args[0], role: args[1] };
      case 'cancelCashMovement':
        return { movimientoId: args[0], motivo: args[1], canceladoPor: args[2], role: args[3] };
      case 'closeCashDay':
        return { cerradoPor: args[0], role: args[1] };
      case 'logInventoryMovement':
        return { tipo: args[0], product: args[1], quantity: args[2], totalPrice: args[3], supplier: args[4], date: args[5], notes: args[6], donde: args[7] };
      case 'logPurchase':
        return { product: args[0], quantity: args[1], totalPrice: args[2], supplier: args[3], date: args[4], notes: args[5] };
      case 'logUso':
        return { product: args[0], quantity: args[1], date: args[2], donde: args[3], notes: args[4] };
      case 'logMaintenance':
        return { area: args[0], item: args[1], doneBy: args[2], date: args[3], notes: args[4] };
      case 'approveAndPushRate':
        return { fecha: args[0], tipoHabitacion: args[1], aprobado: args[2], notas: args[3], aprobadoPor: args[4] };
      case 'approveAllPendingRates':
        return { notas: args[0], aprobadoPor: args[1] };
      default:
        return { args: args };
    }
  }

  function createRunner(successHandler, failureHandler) {
    return new Proxy({}, {
      get: function (_, prop) {
        if (prop === 'withSuccessHandler') {
          return function (handler) { return createRunner(handler, failureHandler); };
        }
        if (prop === 'withFailureHandler') {
          return function (handler) { return createRunner(successHandler, handler); };
        }
        return function () {
          const args = Array.prototype.slice.call(arguments);
          const action = String(prop);
          const payload = mapArgsToPayload(action, args);
          apiCall(action, payload)
            .then(function (data) { if (typeof successHandler === 'function') successHandler(data); })
            .catch(function (error) {
              if (typeof failureHandler === 'function') failureHandler(error);
              else console.error(error);
            });
        };
      }
    });
  }

  window.apiCall = apiCall;
  window.google = window.google || {};
  window.google.script = window.google.script || {};
  window.google.script.run = createRunner(null, null);
})();
