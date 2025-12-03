export function TitleSection({ title }: { title: string }) {
  return (
    <div className="border-b border-design-border w-full">
      <h1 className="ml-30 my-5">{title}</h1>
    </div>
  );
}
