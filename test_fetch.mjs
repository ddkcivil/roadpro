async function test() {
  try {
    const res = await fetch('http://localhost:3000/api/users');
    const text = await res.text();
    console.log(res.status, text);
  } catch (e) {
    console.error(e);
  }
}
test();
