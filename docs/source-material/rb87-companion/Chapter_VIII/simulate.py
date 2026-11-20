"""Reproducible two-site monitored Bose-Hubbard benchmark, dimensionless hbar=J=1."""
import numpy as np
import matplotlib.pyplot as plt
from scipy.linalg import expm
from pathlib import Path
import csv
D=Path(__file__).parent
J=1.; U=4.; hbar=1.; dt=0.005; T=3.; N=1200
rng=np.random.default_rng(20261118)
H=np.array([[U,-np.sqrt(2)*J,0],[-np.sqrt(2)*J,0,-np.sqrt(2)*J],[0,-np.sqrt(2)*J,U]],complex)
nL=np.diag([2,1,0]).astype(complex); nR=np.diag([0,1,2]).astype(complex)
psi0=np.array([.5,1/np.sqrt(2),.5],complex)
ns=int(round(T/dt)); ts=np.linspace(0,T,ns+1); sel=np.array([0,100,200,400,600]);
def ent(psi):
    p=np.maximum(np.abs(psi)**2,1e-300)
    return -np.sum(p*np.log(p),axis=-1)

def simulate(gamma):
    L=[np.sqrt(gamma)*nL, np.sqrt(gamma)*nR]
    gammas=np.array([[np.real(np.diag(x.conj().T@x)) for x in L]])[0] if gamma else np.zeros((2,3))
    G=sum(x.conj().T@x for x in L)
    Heff=H-.5j*G
    M=expm(-1j*Heff*dt)
    state=np.tile(psi0,(N,1))
    rho0=np.outer(psi0,psi0.conj())
    I=np.eye(3,dtype=complex)
    # vectorization convention vec_F(A rho B) = (B.T kron A) vec_F(rho)
    Li=-1j*(np.kron(I,H)-np.kron(H.T,I))
    for l in L:
        ld=l.conj().T@l
        Li+=np.kron(l.conj(),l)-.5*(np.kron(I,ld)+np.kron(ld.T,I))
    exact=[expm(Li*t)@rho0.reshape(-1,order='F') for t in ts[sel]]
    exact=[v.reshape((3,3),order='F') for v in exact]
    rows=[]; series=[]
    for step in range(ns+1):
        if step in sel:
            rho=state.T@state.conj()/N
            probs=np.abs(state)**2
            p11=np.mean(probs[:,1]); s=np.mean(ent(state))
            err=np.linalg.norm(rho-exact[list(sel).index(step)])
            rows.append(dict(gamma=gamma,t=round(step*dt,3),p11_mc=p11,p11_exact=np.real(exact[list(sel).index(step)][1,1]),mean_trajectory_entropy=s,master_purity=np.real(np.trace(exact[list(sel).index(step)]@exact[list(sel).index(step)])),frobenius_error=err,mc_trace=np.trace(rho).real))
            series.append((step*dt,s))
        if step==ns: break
        if gamma==0:
            state=state@M.T
            state/=np.linalg.norm(state,axis=1)[:,None]
            continue
        pL=dt*gamma*np.sum(probs*np.array([4,1,0]),axis=1) if False else dt*gamma*(4*np.abs(state[:,0])**2+np.abs(state[:,1])**2)
        pR=dt*gamma*(np.abs(state[:,1])**2+4*np.abs(state[:,2])**2)
        x=rng.random(N)
        lmask=x<pL; rmask=(x>=pL)&(x<pL+pR); rest=~(lmask|rmask)
        state[lmask]=state[lmask]@nL.T
        state[rmask]=state[rmask]@nR.T
        state[rest]=state[rest]@M.T
        norms=np.linalg.norm(state,axis=1)
        state/=norms[:,None]
    return rows,series
allrows=[]; sers={}
for ga in (0.,.5,2.):
    rows,series=simulate(ga); allrows+=rows;sers[ga]=series
with (D/'trajectory_results.csv').open('w',newline='') as f:
    w=csv.DictWriter(f,fieldnames=list(allrows[0]));w.writeheader();w.writerows(allrows)
fig,ax=plt.subplots(figsize=(7,4))
for ga,ser in sers.items():
    ax.plot(*zip(*ser),label=f'$\\gamma/J={ga}$',marker='o')
ax.set(xlabel=r'Time $Jt/\hbar$',ylabel='Mean trajectory spatial-mode entropy (nats)',title='Conditional trajectory entropy (1200 paths)')
ax.legend(); fig.tight_layout(); fig.savefig(D/'trajectory_entropy.png',dpi=180);plt.close(fig)
fig,ax=plt.subplots(figsize=(7,4))
for ga in (0,.5,2):
    rows=[r for r in allrows if r['gamma']==ga]
    ax.plot([r['t'] for r in rows],[r['p11_exact'] for r in rows],label=f'Exact $\\gamma={ga}$')
    ax.scatter([r['t'] for r in rows],[r['p11_mc'] for r in rows],s=18)
ax.set(xlabel=r'Time $Jt/\hbar$',ylabel=r'$P_{11}$',title='Master equation (lines), Monte Carlo (dots)')
ax.legend();fig.tight_layout();fig.savefig(D/'master_versus_trajectories.png',dpi=180);plt.close(fig)
print('MAX ERROR',max(r['frobenius_error'] for r in allrows))
for r in allrows:
    if r['t']==3: print(r)
