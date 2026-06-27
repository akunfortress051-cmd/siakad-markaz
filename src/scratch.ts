function formatPekan(usbuLabel: string) {
  if (usbuLabel.toLowerCase().includes("usbu")) {
    const num = usbuLabel.replace(/\D/g, "");
    return `PEKAN KE-${num}`;
  }
  if (usbuLabel.toLowerCase() === "nihai") {
    return "PEKAN NIHAI";
  }
  return usbuLabel.toUpperCase();
}

function groupSessions(sesiList: string[]) {
  const nums = sesiList
    .map(s => parseInt(s.replace("SESI_", "")))
    .filter(n => !isNaN(n))
    .sort((a, b) => a - b);
  
  if (nums.length === 0) return "";
  
  let result = [];
  let start = nums[0];
  let end = nums[0];
  
  for (let i = 1; i < nums.length; i++) {
    if (nums[i] === end + 1) {
      end = nums[i];
    } else {
      result.push(start === end ? `${start}` : `${start}-${end}`);
      start = nums[i];
      end = nums[i];
    }
  }
  result.push(start === end ? `${start}` : `${start}-${end}`);
  
  return result.join(", ");
}

console.log(formatPekan("Usbu' 1"));
console.log(formatPekan("Usbu' 2"));
console.log(formatPekan("Nihai"));
console.log(groupSessions(["SESI_1", "SESI_2", "SESI_3"]));
console.log(groupSessions(["SESI_6"]));
console.log(groupSessions(["SESI_1", "SESI_2", "SESI_4", "SESI_5", "SESI_6"]));
