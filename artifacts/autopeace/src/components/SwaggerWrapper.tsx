import SwaggerUI from "swagger-ui-react";
import "swagger-ui-react/swagger-ui.css";
import React from "react";

export default function SwaggerWrapper({ url }: { url: string }) {
  return <SwaggerUI url={url} docExpansion="list" defaultModelsExpandDepth={-1} />;
}
