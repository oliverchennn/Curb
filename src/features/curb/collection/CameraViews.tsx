'use client';

import type { RefObject } from 'react';
import { SENSORS, type SensorId } from './simulation';
import { SchematicFeed } from './StaticDiagram';
import styles from './collection.module.css';

export type FeedCanvases = { focus: HTMLCanvasElement | null; previews: Partial<Record<SensorId, HTMLCanvasElement | null>> };
export type SensorButtons = Partial<Record<SensorId, HTMLButtonElement | null>>;

type Props = {
  feeds: RefObject<FeedCanvases>;
  sensorButtons: RefObject<SensorButtons>;
  seconds: number;
  selected: SensorId;
  autoInspect: boolean;
  reducedMotion: boolean;
  staticMode: boolean;
  onSensor: (sensor: SensorId) => void;
  onAuto: () => void;
};

export function CameraViews({ feeds, sensorButtons, seconds, selected, autoInspect, reducedMotion, staticMode, onSensor, onAuto }: Props) {
  const camera = SENSORS.find(item => item.id === selected)!;
  return <aside className={styles.cameraPanel} aria-labelledby="inspection-camera-heading">
    <div className={styles.cameraHeader}>
      <div><h2 id="inspection-camera-heading">Camera workspace</h2>
        <p>{staticMode ? 'Modeled diagrams' : 'Synchronized simulated cameras'}</p></div>
      <button type="button" className={styles.autoButton} aria-pressed={autoInspect}
        onClick={onAuto} aria-label="Auto inspect">Auto inspect <strong>{autoInspect ? 'On' : 'Off'}</strong></button>
    </div>
    <figure className={styles.focusFeed} aria-label={camera.name + ' simulated camera'} data-selected-camera={selected}>
      <div className={styles.feedImage}>
        {staticMode ? <SchematicFeed sensor={camera.id} seconds={seconds} /> :
          <canvas ref={node => { feeds.current.focus = node; }} data-feed-focus aria-hidden="true" />}
        <div className={styles.frameLabel}><span>CAM {camera.number}</span><span>{staticMode ? 'Static diagram' : 'Simulated camera'}</span></div>
      </div>
      <figcaption><strong>{camera.name}</strong><span>{camera.description}</span></figcaption>
    </figure>
    <div className={styles.feedStrip} role="group" aria-label="Choose a simulated camera">
      {SENSORS.map(item => <button key={item.id} type="button"
        ref={button => { sensorButtons.current[item.id] = button; }} data-sensor-button={item.id}
        aria-label={'Camera ' + item.number + ', ' + item.name + ', simulated camera'}
        aria-pressed={selected === item.id} onClick={() => onSensor(item.id)}>
        <span className={styles.preview}>
          {staticMode ? <SchematicFeed sensor={item.id} seconds={seconds} /> : <canvas
            ref={node => { feeds.current.previews[item.id] = node; }} data-feed-preview={item.id} aria-hidden="true" />}
        </span>
        <span className={styles.cameraButtonText}><span>{item.number}</span><strong>{item.short}</strong></span>
      </button>)}
    </div>
    <p className={styles.cameraLimit}>{reducedMotion && autoInspect ? 'Choose a camera to inspect. Reduced motion keeps the selected view still.' : camera.limit}</p>
  </aside>;
}
