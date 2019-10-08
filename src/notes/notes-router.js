const path = require('path');
const express = require('express');
const xss = require('xss');
const logger = require('../logger');
const NotesService = require('./notes-service');

const notesRouter = express.Router();
const jsonParser = express.json();

const serializeNote = note => ({
  id: note.id,
  name: xss(note.name),
  content: note.content,
  dateModified: note.dateModified,
  folderId: note.folderId
});

notesRouter
  .route('/')
  .get((req, res, next) => {
    NotesService.getAllNotes(req.app.get('db'))
      .then(notes => {
        res.json(notes);
      })
      .catch(next);
  })
  .post(jsonParser, (req, res, next) => {
    const { name, content, dateModified, folderId } = req.body;

    if (!name) {
      logger.error('Name is required');
      return res 
        .status(400)
        .send('Invalid data');
    }

    const newNote = { name, content, dateModified, folderId  };

    NotesService.insertNote(
      req.app.get('db'),
      newNote
    )
      .then(note => {
        logger.info(`note with id ${note.id} created.`);
        res
          .status(201)
          .location(path.posix.join(req.originalUrl, `/${note.id}`))
          .json(serializeNote(note));
      })
      .catch(next);
  });

notesRouter
  .route('/:note_id')
  .all((req, res, next) => {
    NotesService.getById(
      req.app.get('db'),
      req.params.note_id
    )
      .then(note => {
        if (!note) {
          return res.status(404).json({
            error: { message: 'note not found' }
          });
        }
        res.note = note;
        next();
      })
      .catch(next);
  })
  .get((req, res, next) => {
    res.json(serializeNote(res.note));
  })
  .delete((req, res, next) => {
    const { note_id } = req.params;
    NotesService.deleteNote(
      req.app.get('db'),
      note_id
    )
      .then(numRowsAffected => {
        logger.info(`Note with id ${note_id} deleted.`);
        res.status(204).end();
      })
      .catch(next);
  })
  .patch(jsonParser, (req, res, next) => {
    const { name, content, dateModified, folderId  } = req.body;
    const noteToUpdate = { name, content, dateModified, folderId  };

    const numOfValues = Object.values(noteToUpdate).filter(Boolean).length;
    if (numOfValues === 0) {
      return res.status(400).json({
        error: {
          message: 'Request body must contain either \'name\', \'content\',\'dateModified\',\'folderId\''
        }
      });
    }

    NotesService.updateNote(
      req.app.get('db'),
      req.params.note_id,
      noteToUpdate
    )
      .then(numRowsAffected => {
        res.status(204).end();
      })
      .catch(next);
  });

module.exports = notesRouter;