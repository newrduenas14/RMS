/* Hotel Mis Sueños — API bridge for GitHub Pages
   Add this as a NEW file in your existing Apps Script project.
   Do not delete the current web app files until the GitHub version is fully tested.
*/

function doPost(e) {
  try {
    const body = e && e.postData && e.postData.contents ? JSON.parse(e.postData.contents) : {};
    const action = body.action || '';
    const payload = body.payload || {};
    const data = handleHmsApiAction_(action, payload);
    return hmsApiJson_({ success: true, action: action, data: data });
  } catch (err) {
    return hmsApiJson_({ success: false, error: err.message || String(err) });
  }
}

function hmsApiJson_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function _hmsArg_(payload, index, fallback) {
  return payload && payload.args && payload.args.length > index ? payload.args[index] : fallback;
}

function handleHmsApiAction_(action, payload) {
  switch (action) {
    case 'loginUser':
      return loginUser(payload.username, payload.password);

    case 'getUsersAdminPayload':
      return getUsersAdminPayload(payload.requestedBy);

    case 'createUserAdmin':
      return createUserAdmin(payload.user, payload.createdBy);

    case 'getInventoryData':
      return getInventoryData();

    case 'logInventoryMovement':
      return logInventoryMovement(payload.tipo, payload.product, payload.quantity, payload.totalPrice, payload.supplier, payload.date, payload.notes, payload.donde);

    case 'logPurchase':
      return logPurchase(payload.product, payload.quantity, payload.totalPrice, payload.supplier, payload.date, payload.notes);

    case 'logUso':
      return logUso(payload.product, payload.quantity, payload.date, payload.donde, payload.notes);

    case 'getMaintenanceData':
      return getMaintenanceData();

    case 'logMaintenance':
      return logMaintenance(payload.area, payload.item, payload.doneBy, payload.date, payload.notes);

    case 'getCashPayload':
      return getCashPayload(payload.role, payload.selectedDate, payload.userName);

    case 'submitCashMovement':
    case 'addCashMovement':
      return addCashMovement(payload.movement, payload.role);

    case 'cancelCashMovement':
      return cancelCashMovement(payload.movimientoId, payload.motivo, payload.canceladoPor, payload.role);

    case 'closeCashDay':
      return closeCashDay(payload.cerradoPor, payload.role);

    case 'getRevenuePayloads':
      return getRevenuePayloads();

    case 'runRmsPipeline':
      return runRmsPipeline();

    case 'approveAndPushRate':
      return approveAndPushRate(payload.fecha, payload.tipoHabitacion, payload.aprobado, payload.notas, payload.aprobadoPor);

    case 'approveAllPendingRates':
      return approveAllPendingRates(payload.notas, payload.aprobadoPor);

    default:
      throw new Error('Unknown API action: ' + action);
  }
}
