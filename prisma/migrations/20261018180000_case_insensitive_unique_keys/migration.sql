CREATE UNIQUE INDEX "items_serial_no_lower_key" ON "items" (lower("serial_no"));

CREATE UNIQUE INDEX "employees_employee_no_lower_key" ON "employees" (lower("employee_no"));

CREATE UNIQUE INDEX "departments_name_lower_key" ON "departments" (lower("name"));

CREATE UNIQUE INDEX "custody_types_name_lower_key" ON "custody_types" (lower("name"));

CREATE UNIQUE INDEX "documents_doc_no_lower_key" ON "documents" (lower("doc_no"));
