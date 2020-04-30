export default function Test({ name }) {
  const [count, setCount] = React.useState(0)
  return (
    <>
      <p>hello {name}</p>
      <button onClick={() => setCount(count + 1)}>Count: {count}</button>
    </>
  )
}
