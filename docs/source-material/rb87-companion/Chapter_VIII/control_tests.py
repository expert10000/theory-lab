"""Exact dissipative target preparation and three-qubit bit-flip recovery benchmarks."""
import numpy as np
import csv
import matplotlib.pyplot as plt
from pathlib import Path
D=Path(__file__).parent
rng=np.random.default_rng(180826)
kappa=1.; f0=.25; N=3000
# initially in target with prob f0, or in excited state until one exponential jump
initial_target=rng.random(N)<f0
waiting=rng.exponential(1/kappa,N)
times=np.linspace(0,5,21)
rows=[]
for t in times:
    mc=np.mean(initial_target | (waiting<=t))
    exact=1-(1-f0)*np.exp(-kappa*t)
    rows.append((t,exact,mc))
with (D/'dissipative_preparation.csv').open('w',newline='') as f:
    w=csv.writer(f);w.writerow(['kappa_t','exact_target_fidelity','3000_trajectory_fidelity']);w.writerows(rows)
fig,ax=plt.subplots(figsize=(6.8,3.8)); ax.plot(times,[r[1] for r in rows],label='Lindblad exact');ax.scatter(times,[r[2] for r in rows],s=14,label='3000 jump trajectories');ax.set(xlabel=r'$\kappa t$',ylabel='Target fidelity',ylim=(0,1.04),title='Dissipative target preparation');ax.legend();fig.tight_layout();fig.savefig(D/'dissipative_preparation.png',dpi=180);plt.close(fig)
# exactly preserve arbitrary logical qubit a |000> + b |111> under one X error
I=np.eye(2, dtype=complex); X=np.array([[0,1],[1,0]],complex); Z=np.diag([1,-1]).astype(complex)
kron3=lambda A,B,C:np.kron(np.kron(A,B),C)
X2=kron3(I,X,I);S1=kron3(Z,Z,I);S2=kron3(I,Z,Z)
a=np.sqrt(.37);b=np.exp(.63j)*np.sqrt(.63)
psi=np.zeros(8,complex);psi[0]=a;psi[7]=b
corrupted=X2@psi
s1=np.vdot(corrupted,S1@corrupted).real;s2=np.vdot(corrupted,S2@corrupted).real
corrected=X2@corrupted
fidelity=np.abs(np.vdot(psi,corrected))**2
assert abs(s1+1)<1e-12 and abs(s2+1)<1e-12 and abs(fidelity-1)<1e-12
print('QEC syndrome',s1,s2,'fidelity',fidelity)
print('Dissipation MC max deviation',max(abs(r[1]-r[2]) for r in rows))
