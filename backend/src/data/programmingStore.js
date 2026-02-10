/**
 * Programming dashboard data: rebalance list, summary, city breakdown (stub).
 */
const CITIES = ['Mumbai', 'Delhi', 'Bengaluru', 'Chennai', 'Kolkata', 'Hyderabad'];
const REBALANCE_LIST = [];
const SUMMARY = { total: 0, approved: 0, pending: 0, rejected: 0 };

export function getCities() {
  return CITIES;
}

export function getTheatres(query) {
  const city = query?.city;
  return city ? [] : [];
}

export function getRebalanceList() {
  return REBALANCE_LIST;
}

export function getSummary() {
  return SUMMARY;
}

export function getCityBreakdown() {
  return [];
}

export function setRebalanceStatus(id, action) {
  return false;
}
