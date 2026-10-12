const escapeWifi=value=>value.replace(/[\\;,:\"]/g,'\\$&');
export function wifiPayload(ssid,password,security='WPA',hidden=false){
  if(!ssid.trim())throw Error('Nhập tên mạng Wi-Fi.');
  if(!['WPA','WEP','nopass'].includes(security))throw Error('Kiểu bảo mật Wi-Fi không hợp lệ.');
  return `WIFI:T:${security};S:${escapeWifi(ssid)};${security==='nopass'?'':`P:${escapeWifi(password)};`}H:${hidden?'true':'false'};;`;
}
