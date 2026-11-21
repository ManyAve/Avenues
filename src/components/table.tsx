import { mergeProps, renderElement } from "@ui-sdk/react/primitive";
import { defined, type OwnPartProps } from "#avenue/lib/props";
import { cn } from "#avenue/lib/utils";

/**
 * Ported from the app's app/ui/components/ui/table.tsx (e01cc90), unchanged: 40px header row, 8px cell padding,
 * row hover and selected tints. No overflow on the wrapper: registers scroll in their page's pane, and an overflow
 * box here would capture sticky headers and the first column. Column headers get scope="col".
 * Selection, sort state and arrow-key movement belong to the Register composite (AVE-9).
 *
 * Every part takes `render` (AVE-136). On Table it changes the `table`; the container around it stays a `div`.
 */
function Table({ className, render, ...props }: OwnPartProps<"table">) {
  return (
    <div data-slot="table-container" className="relative w-full">
      {renderElement(
        "table",
        mergeProps({ "data-slot": "table", className: cn("w-full caption-bottom text-sm tabular-nums", className) }, defined(props)),
        render,
      )}
    </div>
  );
}

function TableHeader({ className, render, ...props }: OwnPartProps<"thead">) {
  return renderElement(
    "thead",
    mergeProps({ "data-slot": "table-header", className: cn("[&_tr]:border-b", className) }, defined(props)),
    render,
  );
}

function TableBody({ className, render, ...props }: OwnPartProps<"tbody">) {
  return renderElement(
    "tbody",
    mergeProps({ "data-slot": "table-body", className: cn("[&_tr:last-child]:border-0", className) }, defined(props)),
    render,
  );
}

function TableFooter({ className, render, ...props }: OwnPartProps<"tfoot">) {
  return renderElement(
    "tfoot",
    mergeProps({ "data-slot": "table-footer", className: cn("border-t bg-muted/50 font-medium [&>tr]:last:border-b-0", className) }, defined(props)),
    render,
  );
}

function TableRow({ className, render, ...props }: OwnPartProps<"tr">) {
  return renderElement(
    "tr",
    mergeProps({ "data-slot": "table-row", className: cn("border-b transition-colors hover:bg-muted/50 has-aria-expanded:bg-muted/50 data-[state=selected]:bg-muted", className) }, defined(props)),
    render,
  );
}

function TableHead({ className, render, ...props }: OwnPartProps<"th">) {
  return renderElement(
    "th",
    mergeProps({ "data-slot": "table-head", scope: "col", className: cn("h-10 px-2 text-left align-middle font-medium whitespace-nowrap text-foreground [&:has([role=checkbox])]:pr-0 pointer-coarse:[&:has([role=checkbox])]:h-11", className) }, defined(props)),
    render,
  );
}

function TableCell({ className, render, ...props }: OwnPartProps<"td">) {
  return renderElement(
    "td",
    mergeProps({ "data-slot": "table-cell", className: cn("p-2 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0 pointer-coarse:[&:has([role=checkbox])]:h-11", className) }, defined(props)),
    render,
  );
}

function TableCaption({ className, render, ...props }: OwnPartProps<"caption">) {
  return renderElement(
    "caption",
    mergeProps({ "data-slot": "table-caption", className: cn("mt-4 text-sm text-muted-foreground", className) }, defined(props)),
    render,
  );
}

export { Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow };
