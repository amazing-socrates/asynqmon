import React, { useCallback, useState } from "react";
import { connect, ConnectedProps } from "react-redux";
import { makeStyles } from "@material-ui/core/styles";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import Button from "@material-ui/core/Button";
import ButtonGroup from "@material-ui/core/ButtonGroup";
import Checkbox from "@material-ui/core/Checkbox";
import TableContainer from "@material-ui/core/TableContainer";
import TableHead from "@material-ui/core/TableHead";
import TableRow from "@material-ui/core/TableRow";
import Paper from "@material-ui/core/Paper";
import Box from "@material-ui/core/Box";
import Collapse from "@material-ui/core/Collapse";
import IconButton from "@material-ui/core/IconButton";
import KeyboardArrowUpIcon from "@material-ui/icons/KeyboardArrowUp";
import KeyboardArrowDownIcon from "@material-ui/icons/KeyboardArrowDown";
import Typography from "@material-ui/core/Typography";
import TableFooter from "@material-ui/core/TableFooter";
import TablePagination from "@material-ui/core/TablePagination";
import MoreHorizIcon from "@material-ui/icons/MoreHoriz";
import Alert from "@material-ui/lab/Alert";
import AlertTitle from "@material-ui/lab/AlertTitle";
import SyntaxHighlighter from "react-syntax-highlighter";
import syntaxHighlightStyle from "react-syntax-highlighter/dist/esm/styles/hljs/github";
import { AppState } from "../store";
import {
  listDeadTasksAsync,
  deleteDeadTaskAsync,
} from "../actions/tasksActions";
import TablePaginationActions, {
  defaultPageSize,
  rowsPerPageOptions,
} from "./TablePaginationActions";
import { timeAgo } from "../timeutil";
import { usePolling } from "../hooks";
import { DeadTaskExtended } from "../reducers/tasksReducer";

const useStyles = makeStyles({
  table: {
    minWidth: 650,
  },
  actionsContainer: {
    padding: "4px",
  },
  moreIcon: {
    marginRight: "8px",
  },
});

const useRowStyles = makeStyles({
  root: {
    "& > *": {
      borderBottom: "unset",
    },
  },
});

function mapStateToProps(state: AppState) {
  return {
    loading: state.tasks.deadTasks.loading,
    tasks: state.tasks.deadTasks.data,
    pollInterval: state.settings.pollInterval,
  };
}

const mapDispatchToProps = { listDeadTasksAsync, deleteDeadTaskAsync };

const connector = connect(mapStateToProps, mapDispatchToProps);

type ReduxProps = ConnectedProps<typeof connector>;

interface Props {
  queue: string; // name of the queue.
  totalTaskCount: number; // totoal number of dead tasks.
}

function DeadTasksTable(props: Props & ReduxProps) {
  const { pollInterval, listDeadTasksAsync, queue } = props;
  const classes = useStyles();
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [selected, setSelected] = useState<string[]>([]);

  const handleChangePage = (
    event: React.MouseEvent<HTMLButtonElement> | null,
    newPage: number
  ) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setPageSize(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSelectAllClick = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      const newSelected = props.tasks.map((t) => t.id);
      setSelected(newSelected);
    } else {
      setSelected([]);
    }
  };

  const fetchData = useCallback(() => {
    const pageOpts = { page: page + 1, size: pageSize };
    listDeadTasksAsync(queue, pageOpts);
  }, [page, pageSize, queue, listDeadTasksAsync]);

  usePolling(fetchData, pollInterval);

  if (props.tasks.length === 0) {
    return (
      <Alert severity="info">
        <AlertTitle>Info</AlertTitle>
        No dead tasks at this time.
      </Alert>
    );
  }

  const columns = [
    { label: "" },
    { label: "ID" },
    { label: "Type" },
    { label: "Last Failed" },
    { label: "Last Error" },
    { label: "Actions" },
  ];

  const rowCount = props.tasks.length;
  const numSelected = selected.length;
  return (
    <div>
      <div className={classes.actionsContainer}>
        <IconButton aria-label="actions" className={classes.moreIcon}>
          <MoreHorizIcon />
        </IconButton>
        {numSelected > 0 && (
          <ButtonGroup
            variant="text"
            color="primary"
            aria-label="text primary button group"
          >
            <Button>Run</Button>
            <Button>Kill</Button>
            <Button>Delete</Button>
          </ButtonGroup>
        )}
      </div>
      <TableContainer component={Paper}>
        <Table
          stickyHeader={true}
          className={classes.table}
          aria-label="dead tasks table"
          size="small"
        >
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  indeterminate={numSelected > 0 && numSelected < rowCount}
                  checked={rowCount > 0 && numSelected === rowCount}
                  onChange={handleSelectAllClick}
                  inputProps={{ "aria-label": "select all dead tasks" }}
                />
              </TableCell>
              {columns.map((col) => (
                <TableCell key={col.label}>{col.label}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {props.tasks.map((task) => (
              <Row
                key={task.id}
                task={task}
                isSelected={selected.includes(task.id)}
                onSelectChange={(checked: boolean) => {
                  if (checked) {
                    setSelected(selected.concat(task.id));
                  } else {
                    setSelected(selected.filter((id) => id !== task.id));
                  }
                }}
                onDeleteClick={() => {
                  props.deleteDeadTaskAsync(queue, task.key);
                }}
              />
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TablePagination
                rowsPerPageOptions={rowsPerPageOptions}
                colSpan={columns.length + 1 /* checkbox col */}
                count={props.totalTaskCount}
                rowsPerPage={pageSize}
                page={page}
                SelectProps={{
                  inputProps: { "aria-label": "rows per page" },
                  native: true,
                }}
                onChangePage={handleChangePage}
                onChangeRowsPerPage={handleChangeRowsPerPage}
                ActionsComponent={TablePaginationActions}
              />
            </TableRow>
          </TableFooter>
        </Table>
      </TableContainer>
    </div>
  );
}

interface RowProps {
  task: DeadTaskExtended;
  isSelected: boolean;
  onSelectChange: (checked: boolean) => void;
  onDeleteClick: () => void;
}

function Row(props: RowProps) {
  const { task } = props;
  const [open, setOpen] = useState(false);
  const classes = useRowStyles();

  const labelId = `dead-tasks-table-checkbox-${task.id}`;
  return (
    <React.Fragment>
      <TableRow key={task.id} className={classes.root}>
        <TableCell padding="checkbox">
          <Checkbox
            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
              props.onSelectChange(event.target.checked)
            }
            checked={props.isSelected}
            inputProps={{ "aria-labelledby": labelId }}
          />
        </TableCell>
        <TableCell>
          <IconButton
            aria-label="expand row"
            size="small"
            onClick={() => setOpen(!open)}
          >
            {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </TableCell>
        <TableCell component="th" scope="row">
          {task.id}
        </TableCell>
        <TableCell>{task.type}</TableCell>
        <TableCell>{timeAgo(task.last_failed_at)}</TableCell>
        <TableCell>{task.error_message}</TableCell>
        <TableCell>
          <Button onClick={props.onDeleteClick} disabled={task.requestPending}>
            Delete
          </Button>
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={7}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box margin={1}>
              <Typography variant="h6" gutterBottom component="div">
                Payload
              </Typography>
              <SyntaxHighlighter language="json" style={syntaxHighlightStyle}>
                {JSON.stringify(task.payload, null, 2)}
              </SyntaxHighlighter>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </React.Fragment>
  );
}

export default connector(DeadTasksTable);
